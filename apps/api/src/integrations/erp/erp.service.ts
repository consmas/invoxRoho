import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { InvoicesService } from '../../invoices/invoices.service';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationLogService } from '../integration-log.service';

@Injectable()
export class ErpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoices: InvoicesService,
    private readonly logs: IntegrationLogService,
    private readonly audit: AuditService,
  ) {}

  async importInvoices(
    payload: { invoices: Record<string, unknown>[]; idempotencyKey?: string },
    actorUserId?: string,
  ) {
    if (!Array.isArray(payload.invoices)) {
      throw new BadRequestException('invoices must be an array');
    }
    const results: Record<string, unknown>[] = [];
    for (const invoice of payload.invoices) {
      try {
        results.push({
          ok: true,
          invoice: await this.invoices.create(invoice as never),
        });
      } catch (error) {
        results.push({
          ok: false,
          errorMessage:
            error instanceof Error ? error.message : 'Import failed',
          invoice,
        });
      }
    }
    await this.logs.create({
      providerType: 'ERP',
      providerKey: 'mock',
      direction: 'INBOUND',
      operation: 'erp.importInvoices',
      requestJson: payload,
      responseJson: { results },
      status: results.every((row) => row.ok) ? 'SUCCESS' : 'FAILED',
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'ERP_IMPORT',
      afterJson: { results },
      reason: 'Mock ERP invoice import',
    });
    return { results };
  }

  async confirmInvoiceApproval(
    payload: { invoiceId: string; externalReference?: string },
    actorUserId?: string,
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: payload.invoiceId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    await this.logs.create({
      providerType: 'ERP',
      providerKey: 'mock',
      direction: 'OUTBOUND',
      operation: 'erp.confirmInvoiceApproval',
      entityType: 'Invoice',
      entityId: invoice.id,
      requestJson: payload,
      responseJson: { ok: true },
      status: 'SUCCESS',
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.SUBMIT,
      entityType: 'Invoice',
      entityId: invoice.id,
      reason: 'Mock ERP invoice approval confirmation',
    });
    return { ok: true, invoiceId: invoice.id };
  }

  async validateInvoice(invoiceId: string, actorUserId?: string) {
    const before = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!before) throw new NotFoundException('Invoice not found');
    const row = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        fiscalReference:
          before.fiscalReference ?? `MOCK-EINV-${invoiceId.slice(0, 8)}`,
        validationStatus: 'EINVOICING_VALIDATED',
        validationErrors: Prisma.JsonNull,
      },
    });
    await this.logs.create({
      providerType: 'EINVOICING',
      providerKey: 'mock',
      direction: 'OUTBOUND',
      operation: 'einvoicing.validateInvoice',
      entityType: 'Invoice',
      entityId: invoiceId,
      requestJson: before,
      responseJson: {
        fiscalReference: row.fiscalReference,
        validationStatus: row.validationStatus,
      },
      status: 'SUCCESS',
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'Invoice',
      entityId: invoiceId,
      beforeJson: before,
      afterJson: row,
      reason: 'Mock e-invoicing validation',
    });
    return row;
  }
}
