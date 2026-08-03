import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuditAction,
  CounterpartyType,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';
import { parse as parseCsv } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { AuditService } from '../audit/audit.service';
import { EInvoicingService } from '../integrations/einvoicing/einvoicing.service';
import { ErpIntegrationService } from '../integrations/erp/erp-integration.service';
import { ErpInvoicePayload } from '../integrations/erp/erp-provider.interface';
import { IntegrationLogService } from '../integrations/integration-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { verifyWebhookSignature } from '../common/security';

export type ImportSourceType =
  'CSV' | 'EXCEL' | 'API' | 'ERP' | 'WEBHOOK' | 'MANUAL';
type RowStatus =
  'VALID' | 'INVALID' | 'DUPLICATE' | 'IMPORTED' | 'FAILED' | 'SKIPPED';

export interface InvoiceImportContext {
  programmeId?: string;
  programmeCode?: string;
  anchorId?: string;
  sourceReference?: string;
}

export interface NormalizedInvoiceImportRow {
  externalReference?: string;
  programmeCode?: string;
  programmeId?: string;
  buyerRegistrationNumber?: string;
  supplierRegistrationNumber?: string;
  buyerTin?: string;
  supplierTin?: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  purchaseOrderNumber?: string;
  grnNumber?: string;
  taxAmount?: number;
  description?: string;
  buyerApproved?: boolean;
  buyerApprovalReference?: string;
}

@Injectable()
export class InvoiceImportService {
  private readonly maxRows: number;
  private readonly erpWebhookSecret: string;
  private readonly einvoicingWebhookSecret: string;
  private readonly maxCallbackAttempts: number;
  private readonly allowPlaintextWebhookSecrets: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly logs: IntegrationLogService,
    private readonly notifications: NotificationsService,
    private readonly erp: ErpIntegrationService,
    private readonly einvoicing: EInvoicingService,
    config: ConfigService,
  ) {
    this.maxRows = Number(
      config.get<string>('MAX_INVOICE_IMPORT_ROWS') ?? 5000,
    );
    this.erpWebhookSecret =
      config.get<string>('ERP_WEBHOOK_SECRET') ?? 'dev_erp_secret';
    this.einvoicingWebhookSecret =
      config.get<string>('EINVOICING_WEBHOOK_SECRET') ??
      'dev_einvoicing_secret';
    this.maxCallbackAttempts = Number(
      config.get<string>('PROVIDER_WEBHOOK_MAX_RETRIES') ?? 5,
    );
    const appEnv = config.get<string>('APP_ENV') ?? config.get<string>('NODE_ENV');
    this.allowPlaintextWebhookSecrets = appEnv !== 'production';
  }

  findBatches() {
    return this.prisma.invoiceImportBatch.findMany({
      include: { programme: true, anchor: true, uploadedBy: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async findBatch(id: string) {
    const row = await this.prisma.invoiceImportBatch.findUnique({
      where: { id },
      include: { programme: true, anchor: true, uploadedBy: true, rows: true },
    });
    if (!row) throw new NotFoundException('Invoice import batch not found');
    return row;
  }

  findBatchRows(batchId: string) {
    return this.prisma.invoiceImportRow.findMany({
      where: { batchId },
      include: { duplicateOfInvoice: true, createdInvoice: true },
      orderBy: { rowNumber: 'asc' },
    });
  }

  async parseCsvImport(
    fileBuffer: Buffer,
    context: InvoiceImportContext,
    actorUserId?: string,
  ) {
    const rows: Record<string, unknown>[] = parseCsv(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    const batch = await this.createBatchFromRows(
      'CSV',
      rows,
      context,
      actorUserId,
    );
    await this.writeLog(
      'invoice_import.csv',
      'INBOUND',
      context,
      batch,
      'SUCCESS',
    );
    return batch;
  }

  async parseExcelImport(
    fileBuffer: Buffer,
    context: InvoiceImportContext,
    actorUserId?: string,
  ) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet)
      throw new BadRequestException('Excel file has no worksheet');
    const headers = worksheet.getRow(1).values as unknown[];
    const keys = headers.slice(1).map((value) => text(value) ?? '');
    const rows: Record<string, unknown>[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = row.values as unknown[];
      const record: Record<string, unknown> = {};
      keys.forEach((key, index) => {
        if (key) record[key] = values[index + 1];
      });
      if (
        Object.values(record).some((value) => value != null && value !== '')
      ) {
        rows.push(record);
      }
    });
    const batch = await this.createBatchFromRows(
      'EXCEL',
      rows,
      context,
      actorUserId,
    );
    await this.writeLog(
      'invoice_import.excel',
      'INBOUND',
      context,
      batch,
      'SUCCESS',
    );
    return batch;
  }

  importFromApi(
    payload: ErpInvoicePayload[] | { invoices: ErpInvoicePayload[] },
    context: InvoiceImportContext,
    actorUserId?: string,
  ) {
    const rows = Array.isArray(payload) ? payload : payload.invoices;
    if (!Array.isArray(rows))
      throw new BadRequestException('invoices must be an array');
    return this.createBatchFromRows(
      'API',
      rows as unknown as Record<string, unknown>[],
      context,
      actorUserId,
    ).then(async (batch) => {
      await this.writeLog(
        'invoice_import.json',
        'INBOUND',
        context,
        batch,
        'SUCCESS',
      );
      return batch;
    });
  }

  async importFromErp(
    params: InvoiceImportContext & { fromDate?: string; toDate?: string },
    actorUserId?: string,
  ) {
    const cleanParams = {
      ...this.normalizeContext(params),
      fromDate: text(params.fromDate),
      toDate: text(params.toDate),
    };
    const started = Date.now();
    try {
      const result = await this.erp.importInvoices(cleanParams);
      const batch = await this.createBatchFromRows(
        'ERP',
        result.invoices as unknown as Record<string, unknown>[],
        { ...cleanParams, sourceReference: result.providerReference },
        actorUserId,
      );
      await this.logs.create({
        providerType: 'ERP',
        providerKey: result.provider,
        direction: 'INBOUND',
        operation: 'erp.import_invoices',
        requestJson: cleanParams,
        responseJson: result.rawResponse ?? result,
        entityType: 'InvoiceImportBatch',
        entityId: batch.id,
        status: 'SUCCESS',
        durationMs: Date.now() - started,
      });
      return batch;
    } catch (error) {
      await this.logs.create({
        providerType: 'ERP',
        providerKey: 'mock',
        direction: 'INBOUND',
        operation: 'erp.import_invoices',
        requestJson: cleanParams,
        status: 'FAILED',
        errorMessage:
          error instanceof Error ? error.message : 'ERP import failed',
        durationMs: Date.now() - started,
      });
      throw error;
    }
  }

  async processValidRows(batchId: string, actorUserId?: string) {
    const batch = await this.findBatch(batchId);
    if (batch.status === 'CANCELLED')
      throw new BadRequestException('Batch is cancelled');
    const rows = await this.prisma.invoiceImportRow.findMany({
      where: { batchId, status: 'VALID' },
      orderBy: { rowNumber: 'asc' },
    });
    let importedRows = 0;
    let failedRows = 0;
    for (const row of rows) {
      try {
        const normalized =
          row.normalizedJson as unknown as NormalizedInvoiceImportRow;
        const validation = await this.validateImportRow(normalized);
        if (validation.status !== 'VALID') {
          await this.markRow(
            row.id,
            validation.status,
            validation.errors,
            validation.duplicateOfInvoiceId,
          );
          failedRows += 1;
          continue;
        }
        const invoice = await this.prisma.invoice.create({
          data: this.invoiceCreateData(normalized, validation, batchId),
        });
        await this.prisma.invoiceImportRow.update({
          where: { id: row.id },
          data: { status: 'IMPORTED', createdInvoiceId: invoice.id },
        });
        importedRows += 1;
        await this.audit.log({
          actorUserId,
          action: AuditAction.CREATE,
          entityType: 'Invoice',
          entityId: invoice.id,
          afterJson: invoice,
          reason: 'Invoice imported from validated batch row',
        });
        if (invoice.status === InvoiceStatus.APPROVED) {
          await this.notify('invoice.approved_from_import', invoice);
        }
      } catch (error) {
        failedRows += 1;
        await this.prisma.invoiceImportRow.update({
          where: { id: row.id },
          data: {
            status: 'FAILED',
            validationErrors: { messages: [errorMessage(error)] },
          },
        });
      }
    }
    await this.refreshBatchCounts(batchId);
    const updated = await this.prisma.invoiceImportBatch.update({
      where: { id: batchId },
      data: {
        status: failedRows > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
        importedRows,
        failedRows,
        completedAt: new Date(),
      },
      include: { rows: true, programme: true, anchor: true },
    });
    await this.notify(
      failedRows > 0
        ? 'invoice.import_completed_with_errors'
        : 'invoice.import_completed',
      updated,
    );
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'InvoiceImportBatch',
      entityId: batchId,
      afterJson: updated,
      reason: 'Processed valid invoice import rows',
    });
    return updated;
  }

  async cancelBatch(batchId: string, actorUserId?: string) {
    const before = await this.findBatch(batchId);
    const row = await this.prisma.invoiceImportBatch.update({
      where: { id: batchId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
    await this.prisma.invoiceImportRow.updateMany({
      where: { batchId, status: { in: ['PENDING', 'VALID'] } },
      data: { status: 'SKIPPED' },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'InvoiceImportBatch',
      entityId: batchId,
      beforeJson: before,
      afterJson: row,
      reason: 'Invoice import batch cancelled',
    });
    return row;
  }

  async confirmBuyerApproval(
    invoiceId: string,
    params: {
      buyerReference?: string;
      approvalReference?: string;
      source?: string;
    },
    actorUserId?: string,
  ) {
    const before = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!before) throw new NotFoundException('Invoice not found');
    const started = Date.now();
    const result = await this.erp.confirmInvoiceApproval({
      invoiceNumber: before.invoiceNumber,
      buyerReference: params.buyerReference,
      approvalReference: params.approvalReference,
    });
    const invoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: result.approved ? InvoiceStatus.APPROVED : before.status,
        buyerApprovedAt: result.approved
          ? new Date(result.approvedAt ?? Date.now())
          : before.buyerApprovedAt,
        buyerApprovalReference: result.approvalReference,
        buyerApprovalSource: params.source ?? result.provider,
        buyerApprovalImportedAt: result.approved ? new Date() : undefined,
      },
    });
    await this.logs.create({
      providerType: 'ERP',
      providerKey: result.provider,
      direction: 'OUTBOUND',
      operation: 'erp.confirm_invoice_approval',
      entityType: 'Invoice',
      entityId: invoiceId,
      requestJson: params,
      responseJson: result.rawResponse ?? result,
      status: result.approved ? 'SUCCESS' : 'FAILED',
      durationMs: Date.now() - started,
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'Invoice',
      entityId: invoiceId,
      beforeJson: before,
      afterJson: invoice,
      reason: 'Buyer approval imported from ERP',
    });
    if (result.approved)
      await this.notify('invoice.approved_from_import', invoice);
    return invoice;
  }

  async runEInvoicingValidation(invoiceId: string, actorUserId?: string) {
    const before = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { buyer: true, supplier: true },
    });
    if (!before) throw new NotFoundException('Invoice not found');
    const started = Date.now();
    const result = await this.einvoicing.validateInvoice({
      invoiceNumber: before.invoiceNumber,
      supplierTin: before.supplier.tin ?? undefined,
      buyerTin: before.buyer.tin ?? undefined,
      amount: Number(before.amount),
      currency: before.currency,
      issueDate: before.issueDate.toISOString().slice(0, 10),
    });
    const invoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        einvoicingStatus: result.status,
        einvoicingReference: result.fiscalReference,
        fiscalReference: result.fiscalReference ?? before.fiscalReference,
        einvoicingCheckedAt: new Date(),
        einvoicingResponseJson: result.rawResponse as Prisma.InputJsonValue,
        validationStatus:
          result.status === 'VALIDATED'
            ? 'EINVOICING_VALIDATED'
            : 'EINVOICING_EXCEPTION',
        validationErrors: result.reason
          ? { messages: [result.reason] }
          : Prisma.JsonNull,
      },
    });
    await this.logs.create({
      providerType: 'EINVOICING',
      providerKey: result.provider,
      direction: 'OUTBOUND',
      operation: 'einvoicing.validate_invoice',
      entityType: 'Invoice',
      entityId: invoiceId,
      requestJson: { invoiceId, invoiceNumber: before.invoiceNumber },
      responseJson: result.rawResponse ?? result,
      status: result.status === 'VALIDATED' ? 'SUCCESS' : 'FAILED',
      durationMs: Date.now() - started,
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'Invoice',
      entityId: invoiceId,
      beforeJson: before,
      afterJson: invoice,
      reason: 'Mock e-invoicing validation',
    });
    if (result.status !== 'VALIDATED') {
      await this.createException('EINVOICING_FAILED', { invoiceId, result });
      await this.notify('einvoicing.validation_failed', invoice);
    }
    return invoice;
  }

  async runDuplicateCheck(invoiceId: string, actorUserId?: string) {
    const before = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!before) throw new NotFoundException('Invoice not found');
    const duplicate = await this.detectDuplicateInvoice(
      {
        invoiceNumber: before.invoiceNumber,
        amount: Number(before.amount),
        currency: before.currency,
        dueDate: before.dueDate.toISOString(),
        externalReference: before.externalReference ?? undefined,
        programmeId: before.programmeId,
      },
      before.id,
    );
    const invoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        duplicateCheckStatus: duplicate ? 'DUPLICATE' : 'CLEAR',
        validationErrors: duplicate
          ? {
              messages: ['Duplicate invoice detected'],
              duplicateOfInvoiceId: duplicate.id,
            }
          : undefined,
      },
    });
    await this.logs.create({
      providerType: 'INVOICE_IMPORT',
      providerKey: 'internal',
      direction: 'INBOUND',
      operation: 'invoice.duplicate_check',
      entityType: 'Invoice',
      entityId: invoiceId,
      requestJson: { invoiceId },
      responseJson: { duplicateOfInvoiceId: duplicate?.id },
      status: duplicate ? 'FAILED' : 'SUCCESS',
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'Invoice',
      entityId: invoiceId,
      beforeJson: before,
      afterJson: invoice,
      reason: 'Invoice duplicate check',
    });
    if (duplicate) {
      await this.createException('DUPLICATE_INVOICE', {
        invoiceId,
        duplicateOfInvoiceId: duplicate.id,
      });
      await this.notify('invoice.duplicate_detected', invoice);
    }
    return invoice;
  }

  findExceptions() {
    return this.prisma.invoiceImportRow.findMany({
      where: { status: { in: ['INVALID', 'DUPLICATE', 'FAILED'] } },
      include: { batch: true, duplicateOfInvoice: true, createdInvoice: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  findProviderWebhookEvents() {
    return this.prisma.providerWebhookEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async findProviderWebhookEvent(id: string) {
    const row = await this.prisma.providerWebhookEvent.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Provider webhook event not found');
    return row;
  }

  async processErpWebhook(
    payload: Record<string, unknown>,
    signature?: string,
  ) {
    return this.processProviderWebhook('ERP', 'mock', payload, signature);
  }

  async processEInvoicingWebhook(
    payload: Record<string, unknown>,
    signature?: string,
  ) {
    return this.processProviderWebhook(
      'EINVOICING',
      'mock',
      payload,
      signature,
    );
  }

  async retryProviderWebhookEvent(id: string) {
    const event = await this.findProviderWebhookEvent(id);
    await this.prisma.providerWebhookEvent.update({
      where: { id },
      data: { status: 'RETRYING', nextAttemptAt: null },
    });
    return this.replayProviderWebhookEvent(event.id);
  }

  async reconcileProviderCallbacks() {
    const events = await this.prisma.providerWebhookEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const counts = events.reduce<Record<string, number>>((acc, event) => {
      acc[event.reconciliationStatus] =
        (acc[event.reconciliationStatus] ?? 0) + 1;
      return acc;
    }, {});
    return { counts, events };
  }

  private async processProviderWebhook(
    providerType: 'ERP' | 'EINVOICING',
    providerKey: string,
    payload: Record<string, unknown>,
    signature?: string,
  ) {
    const eventReference =
      scalarString(payload.eventReference) ??
      scalarString(payload.id) ??
      `${providerType.toLowerCase()}-${Date.now()}`;
    const existing = await this.prisma.providerWebhookEvent.findUnique({
      where: { eventReference },
    });
    if (existing) {
      return { duplicate: true, event: existing };
    }
    const signatureValid = this.validProviderSignature(
      providerType,
      payload,
      signature,
    );
    const eventType =
      scalarString(payload.eventType) ??
      (providerType === 'ERP' ? 'erp.invoice_callback' : 'einvoicing.status');
    const event = await this.prisma.providerWebhookEvent.create({
      data: {
        providerType,
        providerKey,
        eventType,
        eventReference,
        signatureValid,
        payloadJson: payload as Prisma.InputJsonValue,
        status: signatureValid ? 'PENDING' : 'FAILED',
        maxAttempts: this.maxCallbackAttempts,
        processingError: signatureValid ? undefined : 'Invalid signature',
      },
    });
    if (!signatureValid) {
      await this.logs.create({
        providerType,
        providerKey,
        direction: 'INBOUND',
        operation:
          providerType === 'ERP'
            ? 'erp.webhook_received'
            : 'einvoicing.webhook_received',
        requestJson: payload,
        responseJson: { signatureValid },
        status: 'FAILED',
      });
      return { event, signatureValid };
    }
    return this.replayProviderWebhookEvent(event.id);
  }

  private async replayProviderWebhookEvent(id: string) {
    const event = await this.findProviderWebhookEvent(id);
    const attempts = event.attempts + 1;
    try {
      const payload = event.payloadJson as Record<string, unknown>;
      const result =
        event.providerType === 'ERP'
          ? await this.applyErpCallback(payload)
          : await this.applyEInvoicingCallback(payload);
      const row = await this.prisma.providerWebhookEvent.update({
        where: { id },
        data: {
          attempts,
          lastAttemptAt: new Date(),
          status: 'PROCESSED',
          entityType: result.entityType,
          entityId: result.entityId,
          processedAt: new Date(),
          processingError: null,
          reconciliationStatus: result.reconciliationStatus,
          reconciliationNotes: result.reconciliationNotes,
          nextAttemptAt: null,
        },
      });
      await this.logs.create({
        providerType: event.providerType,
        providerKey: event.providerKey,
        direction: 'INBOUND',
        operation:
          event.providerType === 'ERP'
            ? 'erp.webhook_processed'
            : 'einvoicing.webhook_processed',
        entityType: result.entityType,
        entityId: result.entityId,
        requestJson: payload,
        responseJson: result,
        status: 'SUCCESS',
        attempt: attempts,
      });
      return { event: row, result };
    } catch (error) {
      const failed = attempts >= event.maxAttempts;
      const row = await this.prisma.providerWebhookEvent.update({
        where: { id },
        data: {
          attempts,
          lastAttemptAt: new Date(),
          status: failed ? 'FAILED' : 'RETRYING',
          nextAttemptAt: failed
            ? null
            : new Date(Date.now() + attempts * 60 * 1000),
          processingError: errorMessage(error),
          reconciliationStatus: 'UNMATCHED',
          reconciliationNotes: errorMessage(error),
        },
      });
      await this.logs.create({
        providerType: event.providerType,
        providerKey: event.providerKey,
        direction: 'INBOUND',
        operation:
          event.providerType === 'ERP'
            ? 'erp.webhook_processed'
            : 'einvoicing.webhook_processed',
        requestJson: event.payloadJson,
        status: 'FAILED',
        errorMessage: errorMessage(error),
        attempt: attempts,
      });
      return { event: row };
    }
  }

  private async applyErpCallback(payload: Record<string, unknown>) {
    const eventType = scalarString(payload.eventType) ?? '';
    if (eventType.includes('approval')) {
      const invoice = await this.findInvoiceForCallback(payload);
      if (!invoice)
        throw new NotFoundException('Invoice not found for ERP callback');
      const updated = await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.APPROVED,
          buyerApprovedAt: new Date(),
          buyerApprovalReference:
            scalarString(payload.approvalReference) ??
            scalarString(payload.buyerApprovalReference),
          buyerApprovalSource: 'ERP_WEBHOOK',
          buyerApprovalImportedAt: new Date(),
        },
      });
      await this.audit.log({
        action: AuditAction.UPDATE,
        entityType: 'Invoice',
        entityId: updated.id,
        beforeJson: invoice,
        afterJson: updated,
        reason: 'ERP approval callback processed',
      });
      await this.notify('invoice.approved_from_import', updated);
      return {
        entityType: 'Invoice',
        entityId: updated.id,
        reconciliationStatus: 'MATCHED',
        reconciliationNotes: 'ERP approval matched to invoice',
      };
    }
    const invoices = Array.isArray(payload.invoices)
      ? (payload.invoices as Record<string, unknown>[])
      : payload.invoice && typeof payload.invoice === 'object'
        ? [payload.invoice as Record<string, unknown>]
        : [];
    if (!invoices.length)
      throw new BadRequestException('ERP callback has no invoices');
    const batch = await this.createBatchFromRows('WEBHOOK', invoices, {
      programmeCode: scalarString(payload.programmeCode),
      sourceReference: scalarString(payload.eventReference),
    });
    return {
      entityType: 'InvoiceImportBatch',
      entityId: batch.id,
      reconciliationStatus:
        batch.invalidRows || batch.duplicateRows ? 'MISMATCHED' : 'MATCHED',
      reconciliationNotes: 'ERP invoice callback converted to import batch',
    };
  }

  private async applyEInvoicingCallback(payload: Record<string, unknown>) {
    const invoice = await this.findInvoiceForCallback(payload);
    if (!invoice)
      throw new NotFoundException('Invoice not found for e-invoicing callback');
    const status =
      scalarString(payload.status) ??
      scalarString(payload.einvoicingStatus) ??
      'REFERRED';
    const normalizedStatus = ['VALIDATED', 'FAILED', 'REFERRED'].includes(
      status,
    )
      ? status
      : 'REFERRED';
    const updated = await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        einvoicingStatus: normalizedStatus,
        einvoicingReference:
          scalarString(payload.fiscalReference) ??
          scalarString(payload.einvoicingReference),
        fiscalReference:
          scalarString(payload.fiscalReference) ?? invoice.fiscalReference,
        einvoicingCheckedAt: new Date(),
        einvoicingResponseJson: payload as Prisma.InputJsonValue,
        validationStatus:
          normalizedStatus === 'VALIDATED'
            ? 'EINVOICING_VALIDATED'
            : 'EINVOICING_EXCEPTION',
        validationErrors:
          normalizedStatus === 'VALIDATED'
            ? Prisma.JsonNull
            : {
                messages: [
                  scalarString(payload.reason) ??
                    'E-invoicing callback exception',
                ],
              },
      },
    });
    await this.audit.log({
      action: AuditAction.UPDATE,
      entityType: 'Invoice',
      entityId: updated.id,
      beforeJson: invoice,
      afterJson: updated,
      reason: 'E-invoicing callback processed',
    });
    if (normalizedStatus !== 'VALIDATED') {
      await this.createException('EINVOICING_FAILED', {
        invoiceId: updated.id,
        payload,
      });
      await this.notify('einvoicing.validation_failed', updated);
    }
    return {
      entityType: 'Invoice',
      entityId: updated.id,
      reconciliationStatus:
        normalizedStatus === 'VALIDATED' ? 'MATCHED' : 'MISMATCHED',
      reconciliationNotes: `E-invoicing status ${normalizedStatus}`,
    };
  }

  private async findInvoiceForCallback(payload: Record<string, unknown>) {
    const invoiceId = scalarString(payload.invoiceId);
    if (invoiceId) {
      const row = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
      });
      if (row) return row;
    }
    const invoiceNumber = scalarString(payload.invoiceNumber);
    if (invoiceNumber) {
      const row = await this.prisma.invoice.findFirst({
        where: { invoiceNumber },
      });
      if (row) return row;
    }
    const externalReference = scalarString(payload.externalReference);
    if (externalReference) {
      const row = await this.prisma.invoice.findFirst({
        where: { externalReference },
      });
      if (row) return row;
    }
    const fiscalReference =
      scalarString(payload.fiscalReference) ??
      scalarString(payload.einvoicingReference);
    if (fiscalReference) {
      return this.prisma.invoice.findFirst({
        where: {
          OR: [{ fiscalReference }, { einvoicingReference: fiscalReference }],
        },
      });
    }
    return null;
  }

  private validProviderSignature(
    providerType: 'ERP' | 'EINVOICING',
    payload: Record<string, unknown>,
    signature?: string,
  ) {
    if (!signature) return false;
    const secret =
      providerType === 'ERP'
        ? this.erpWebhookSecret
        : this.einvoicingWebhookSecret;
    return verifyWebhookSignature({
      payload,
      secret,
      signature,
      allowPlaintextSecret: this.allowPlaintextWebhookSecrets,
    });
  }

  private async createBatchFromRows(
    sourceType: ImportSourceType,
    rawRows: Record<string, unknown>[],
    context: InvoiceImportContext,
    actorUserId?: string,
  ) {
    const cleanContext = this.normalizeContext(context);
    if (rawRows.length > this.maxRows) {
      throw new BadRequestException(`Import row count exceeds ${this.maxRows}`);
    }
    const batch = await this.prisma.invoiceImportBatch.create({
      data: {
        sourceType,
        sourceReference: cleanContext.sourceReference,
        programmeId: cleanContext.programmeId,
        anchorId: cleanContext.anchorId,
        uploadedById: actorUserId,
        status: 'PROCESSING',
        startedAt: new Date(),
        totalRows: rawRows.length,
      },
    });
    let validRows = 0;
    let invalidRows = 0;
    let duplicateRows = 0;
    for (const [index, raw] of rawRows.entries()) {
      const normalized = this.normalizeRow(raw, cleanContext);
      const validation = await this.validateImportRow(normalized);
      if (validation.status === 'VALID') validRows += 1;
      if (validation.status === 'INVALID') invalidRows += 1;
      if (validation.status === 'DUPLICATE') duplicateRows += 1;
      await this.prisma.invoiceImportRow.create({
        data: {
          batchId: batch.id,
          rowNumber: index + 1,
          rawJson: raw as Prisma.InputJsonValue,
          normalizedJson: normalized as unknown as Prisma.InputJsonValue,
          status: validation.status,
          validationErrors: validation.errors
            ? { messages: validation.errors }
            : undefined,
          duplicateOfInvoiceId: validation.duplicateOfInvoiceId,
        },
      });
      if (validation.status !== 'VALID') {
        await this.createException(this.exceptionReason(validation), {
          batchId: batch.id,
          rowNumber: index + 1,
          errors: validation.errors,
          duplicateOfInvoiceId: validation.duplicateOfInvoiceId,
        });
      }
    }
    const status =
      invalidRows || duplicateRows ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';
    const updated = await this.prisma.invoiceImportBatch.update({
      where: { id: batch.id },
      data: {
        status,
        validRows,
        invalidRows,
        duplicateRows,
        completedAt: new Date(),
        errorSummary:
          invalidRows || duplicateRows
            ? `${invalidRows} invalid rows, ${duplicateRows} duplicate rows`
            : undefined,
      },
      include: { rows: true, programme: true, anchor: true },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'InvoiceImportBatch',
      entityId: updated.id,
      afterJson: updated,
      reason: `${sourceType} invoice import parsed`,
    });
    await this.notify(
      status === 'COMPLETED'
        ? 'invoice.import_completed'
        : 'invoice.import_completed_with_errors',
      updated,
    );
    return updated;
  }

  async validateImportRow(row: NormalizedInvoiceImportRow) {
    const errors: string[] = [];
    const programme = row.programmeId
      ? await this.prisma.programme.findUnique({
          where: { id: row.programmeId },
        })
      : row.programmeCode
        ? await this.prisma.programme.findUnique({
            where: { code: row.programmeCode },
          })
        : null;
    if (!programme) errors.push('programme exists');
    const buyer = await this.findCounterparty(CounterpartyType.ANCHOR, {
      id: programme?.anchorId,
      registrationNumber: row.buyerRegistrationNumber,
      tin: row.buyerTin,
    });
    if (!buyer) errors.push('buyer exists and is ANCHOR');
    const supplier = await this.findSupplier(row, programme?.id);
    if (!supplier) errors.push('supplier exists and is SUPPLIER');
    if (programme && buyer && programme.anchorId !== buyer.id) {
      errors.push('buyer matches programme anchor');
    }
    if (programme && supplier) {
      const participant = await this.prisma.programmeParticipant.findUnique({
        where: {
          programmeId_counterpartyId_participantType: {
            programmeId: programme.id,
            counterpartyId: supplier.id,
            participantType: CounterpartyType.SUPPLIER,
          },
        },
      });
      if (!participant?.isActive)
        errors.push('supplier is programme participant');
    }
    if (!row.invoiceNumber) errors.push('invoice number required');
    if (!(Number(row.amount) > 0)) errors.push('amount greater than zero');
    if (!row.currency) errors.push('currency required');
    if (!isValidDate(row.issueDate)) errors.push('issue date valid');
    if (!isValidDate(row.dueDate)) errors.push('due date valid');
    if (
      isValidDate(row.issueDate) &&
      isValidDate(row.dueDate) &&
      new Date(row.dueDate) <= new Date(row.issueDate)
    ) {
      errors.push('due date after issue date');
    }
    const duplicate = await this.detectDuplicateInvoice({
      ...row,
      programmeId: programme?.id,
      buyerId: buyer?.id,
      supplierId: supplier?.id,
    });
    if (duplicate) {
      return {
        status: 'DUPLICATE' as RowStatus,
        errors: ['duplicate invoice blocked'],
        duplicateOfInvoiceId: duplicate.id,
        programme,
        buyer,
        supplier,
      };
    }
    if (!row.buyerApproved)
      errors.push('buyer approval required before financeable status');
    if (errors.length) {
      return {
        status: 'INVALID' as RowStatus,
        errors,
        programme,
        buyer,
        supplier,
      };
    }
    return { status: 'VALID' as RowStatus, programme, buyer, supplier };
  }

  private async detectDuplicateInvoice(
    row: Partial<NormalizedInvoiceImportRow> & {
      buyerId?: string;
      supplierId?: string;
      programmeId?: string;
    },
    excludeInvoiceId?: string,
  ) {
    const notCurrent = excludeInvoiceId
      ? { id: { not: excludeInvoiceId } }
      : {};
    if (row.buyerId && row.supplierId && row.invoiceNumber) {
      const exact = await this.prisma.invoice.findFirst({
        where: {
          ...notCurrent,
          buyerId: row.buyerId,
          supplierId: row.supplierId,
          invoiceNumber: row.invoiceNumber,
        },
      });
      if (exact) return exact;
    }
    if (row.externalReference) {
      const external = await this.prisma.invoice.findFirst({
        where: { ...notCurrent, externalReference: row.externalReference },
      });
      if (external) return external;
    }
    if (row.supplierId && row.amount && row.dueDate && row.invoiceNumber) {
      const prefix = row.invoiceNumber.slice(
        0,
        Math.min(6, row.invoiceNumber.length),
      );
      return this.prisma.invoice.findFirst({
        where: {
          ...notCurrent,
          supplierId: row.supplierId,
          amount: new Prisma.Decimal(row.amount),
          dueDate: new Date(row.dueDate),
          invoiceNumber: { startsWith: prefix },
        },
      });
    }
    return null;
  }

  private invoiceCreateData(
    row: NormalizedInvoiceImportRow,
    validation: Awaited<ReturnType<InvoiceImportService['validateImportRow']>>,
    batchId: string,
  ): Prisma.InvoiceUncheckedCreateInput {
    if (!validation.programme || !validation.buyer || !validation.supplier) {
      throw new BadRequestException(
        'Validated row is missing resolved entities',
      );
    }
    return {
      programmeId: validation.programme.id,
      buyerId: validation.buyer.id,
      supplierId: validation.supplier.id,
      invoiceNumber: row.invoiceNumber,
      externalReference: row.externalReference,
      ingestionChannel: 'IMPORT',
      sourceSystem: row.programmeCode ? 'ERP' : 'INVOICE_IMPORT',
      sourceType: row.programmeCode ? 'ERP' : 'IMPORT',
      importBatchId: batchId,
      purchaseOrderNumber: row.purchaseOrderNumber,
      goodsReceivedNote: row.grnNumber,
      currency: row.currency,
      amount: new Prisma.Decimal(row.amount),
      taxAmount: new Prisma.Decimal(row.taxAmount ?? 0),
      financeableAmount: new Prisma.Decimal(row.amount),
      issueDate: new Date(row.issueDate),
      dueDate: new Date(row.dueDate),
      status: row.buyerApproved
        ? InvoiceStatus.APPROVED
        : InvoiceStatus.RECEIVED,
      buyerApprovedAt: row.buyerApproved ? new Date() : undefined,
      buyerApprovalReference: row.buyerApprovalReference,
      buyerApprovalSource: row.buyerApproved ? 'IMPORT' : undefined,
      buyerApprovalImportedAt: row.buyerApproved ? new Date() : undefined,
      validationStatus: 'PASSED',
      duplicateCheckStatus: 'CLEAR',
      fraudCheckStatus: 'CLEAR',
      description: row.description,
    };
  }

  private normalizeRow(
    raw: Record<string, unknown>,
    context: InvoiceImportContext,
  ): NormalizedInvoiceImportRow {
    return {
      externalReference: text(raw.externalReference),
      programmeCode: text(raw.programmeCode) ?? context.programmeCode,
      programmeId: context.programmeId,
      buyerRegistrationNumber:
        text(raw.buyerRegistrationNumber) ?? context.anchorId,
      supplierRegistrationNumber: text(raw.supplierRegistrationNumber),
      buyerTin: text(raw.buyerTin),
      supplierTin: text(raw.supplierTin),
      invoiceNumber: text(raw.invoiceNumber) ?? '',
      amount: numberValue(raw.amount),
      currency: text(raw.currency) ?? 'GHS',
      issueDate: dateText(raw.issueDate),
      dueDate: dateText(raw.dueDate),
      purchaseOrderNumber: text(raw.purchaseOrderNumber),
      grnNumber: text(raw.grnNumber),
      taxAmount: numberValue(raw.taxAmount),
      description: text(raw.description),
      buyerApproved: booleanValue(raw.buyerApproved),
      buyerApprovalReference: text(raw.buyerApprovalReference),
    };
  }

  private normalizeContext(context: InvoiceImportContext): InvoiceImportContext {
    return {
      programmeId: text(context.programmeId),
      programmeCode: text(context.programmeCode),
      anchorId: text(context.anchorId),
      sourceReference: text(context.sourceReference),
    };
  }

  private async findCounterparty(
    type: CounterpartyType,
    keys: { id?: string; registrationNumber?: string; tin?: string },
  ) {
    const where = [
      keys.id ? { id: keys.id } : undefined,
      keys.registrationNumber
        ? { registrationNumber: keys.registrationNumber }
        : undefined,
      keys.tin ? { tin: keys.tin } : undefined,
    ].filter(Boolean) as Prisma.CounterpartyWhereInput[];
    if (!where.length) return null;
    return this.prisma.counterparty.findFirst({ where: { type, OR: where } });
  }

  private async findSupplier(
    row: NormalizedInvoiceImportRow,
    programmeId?: string,
  ) {
    const supplier = await this.findCounterparty(CounterpartyType.SUPPLIER, {
      registrationNumber: row.supplierRegistrationNumber,
      tin: row.supplierTin,
    });
    if (supplier || !programmeId) return supplier;
    const participant = await this.prisma.programmeParticipant.findFirst({
      where: {
        programmeId,
        participantType: CounterpartyType.SUPPLIER,
        isActive: true,
      },
      include: { counterparty: true },
      orderBy: { createdAt: 'asc' },
    });
    return participant?.counterparty ?? null;
  }

  private async markRow(
    rowId: string,
    status: RowStatus,
    errors?: string[],
    duplicateOfInvoiceId?: string,
  ) {
    await this.prisma.invoiceImportRow.update({
      where: { id: rowId },
      data: {
        status,
        validationErrors: errors ? { messages: errors } : undefined,
        duplicateOfInvoiceId,
      },
    });
  }

  private async refreshBatchCounts(batchId: string) {
    const rows = await this.prisma.invoiceImportRow.groupBy({
      by: ['status'],
      where: { batchId },
      _count: { status: true },
    });
    const count = (status: string) =>
      rows.find((row) => row.status === status)?._count.status ?? 0;
    await this.prisma.invoiceImportBatch.update({
      where: { id: batchId },
      data: {
        validRows: count('VALID'),
        invalidRows: count('INVALID'),
        duplicateRows: count('DUPLICATE'),
        importedRows: count('IMPORTED'),
        failedRows: count('FAILED'),
      },
    });
  }

  private createException(reason: string, payload: Record<string, unknown>) {
    return this.prisma.workflowCase.create({
      data: {
        caseType: `INVOICE_EXCEPTION:${reason}`,
        priority: reason === 'DUPLICATE_INVOICE' ? 'HIGH' : 'NORMAL',
        assignedRole: 'OPERATIONS_ANALYST',
        historyJson: payload as Prisma.InputJsonValue,
      },
    });
  }

  private exceptionReason(validation: {
    status: RowStatus;
    errors?: string[];
  }) {
    if (validation.status === 'DUPLICATE') return 'DUPLICATE_INVOICE';
    const first = validation.errors?.[0] ?? 'INVALID_ROW';
    if (first.includes('supplier exists')) return 'MISSING_SUPPLIER';
    if (first.includes('supplier is programme participant'))
      return 'SUPPLIER_NOT_IN_PROGRAMME';
    if (first.includes('buyer matches programme anchor'))
      return 'BUYER_MISMATCH';
    if (first.includes('buyer approval')) return 'APPROVAL_MISSING';
    return 'INVALID_ROW';
  }

  private async writeLog(
    operation: string,
    direction: 'INBOUND' | 'OUTBOUND',
    requestJson: unknown,
    batch: { id: string },
    status: 'SUCCESS' | 'FAILED',
  ) {
    await this.logs.create({
      providerType: 'INVOICE_IMPORT',
      providerKey: 'internal',
      direction,
      operation,
      entityType: 'InvoiceImportBatch',
      entityId: batch.id,
      requestJson,
      responseJson: { batchId: batch.id },
      status,
    });
  }

  private async notify(
    event: string,
    entity: { id: string; status?: string; invoiceNumber?: string },
  ) {
    await this.notifications
      .createLifecycleEmail(event, undefined, {
        entityName: entity.invoiceNumber ?? entity.id,
        status: entity.status ?? event,
      })
      .catch(() => undefined);
  }
}

function text(value: unknown) {
  if (value == null || value === '') return undefined;
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return undefined;
}

function numberValue(value: unknown) {
  if (value == null || value === '') return 0;
  return Number(value);
}

function booleanValue(value: unknown) {
  if (typeof value === 'boolean') return value;
  const normalized = text(value)?.toLowerCase() ?? '';
  return ['true', 'yes', 'y', '1', 'approved'].includes(normalized);
}

function dateText(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    return new Date(Math.round((value - 25569) * 86400 * 1000))
      .toISOString()
      .slice(0, 10);
  }
  return text(value) ?? '';
}

function isValidDate(value: string) {
  return Boolean(value) && !Number.isNaN(new Date(value).getTime());
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Import row failed';
}

function scalarString(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  return undefined;
}
