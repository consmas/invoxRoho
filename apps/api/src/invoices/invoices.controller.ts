import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceImportService } from './invoice-import.service';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly imports: InvoiceImportService,
  ) {}

  @RequirePermissions(PERMISSIONS.invoiceCreate)
  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoices.create(dto);
  }

  @RequirePermissions(PERMISSIONS.invoiceRead)
  @Get()
  findAll() {
    return this.invoices.findAll();
  }

  @RequirePermissions(PERMISSIONS.invoicesImport)
  @Post('import/csv')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(
    @UploadedFile()
    file: { buffer: Buffer; mimetype?: string; originalname?: string },
    @Body()
    body: { programmeId?: string; programmeCode?: string; anchorId?: string },
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!file?.buffer) throw new BadRequestException('CSV file is required');
    return this.imports.parseCsvImport(file.buffer, body, user?.id);
  }

  @RequirePermissions(PERMISSIONS.invoicesImport)
  @Post('import/excel')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(
    @UploadedFile()
    file: { buffer: Buffer; mimetype?: string; originalname?: string },
    @Body()
    body: { programmeId?: string; programmeCode?: string; anchorId?: string },
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!file?.buffer) throw new BadRequestException('Excel file is required');
    return this.imports.parseExcelImport(file.buffer, body, user?.id);
  }

  @RequirePermissions(PERMISSIONS.invoicesImport)
  @Post('import/json')
  importJson(
    @Body()
    payload:
      | Record<string, unknown>[]
      | {
          invoices: Record<string, unknown>[];
          programmeId?: string;
          programmeCode?: string;
          anchorId?: string;
        },
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const context = Array.isArray(payload)
      ? {}
      : {
          programmeId: payload.programmeId,
          programmeCode: payload.programmeCode,
          anchorId: payload.anchorId,
        };
    return this.imports.importFromApi(payload as never, context, user?.id);
  }

  @RequirePermissions(PERMISSIONS.invoicesImport)
  @Post('import/erp')
  importErp(
    @Body()
    body: {
      programmeId?: string;
      programmeCode?: string;
      anchorId?: string;
      fromDate?: string;
      toDate?: string;
    },
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.imports.importFromErp(body, user?.id);
  }

  @RequirePermissions(PERMISSIONS.integrationsRead)
  @Get('import/batches')
  findImportBatches() {
    return this.imports.findBatches();
  }

  @RequirePermissions(PERMISSIONS.integrationsRead)
  @Get('import/batches/:id')
  findImportBatch(@Param('id') id: string) {
    return this.imports.findBatch(id);
  }

  @RequirePermissions(PERMISSIONS.integrationsRead)
  @Get('import/batches/:id/rows')
  findImportRows(@Param('id') id: string) {
    return this.imports.findBatchRows(id);
  }

  @RequirePermissions(PERMISSIONS.invoicesImport)
  @Post('import/batches/:id/process-valid-rows')
  processValidRows(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.imports.processValidRows(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.invoicesImport)
  @Post('import/batches/:id/cancel')
  cancelImportBatch(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.imports.cancelBatch(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.invoiceRead)
  @Get('exceptions')
  findExceptions() {
    return this.imports.findExceptions();
  }

  @RequirePermissions(PERMISSIONS.integrationsRead)
  @Get('provider-webhook-events')
  findProviderWebhookEvents() {
    return this.imports.findProviderWebhookEvents();
  }

  @RequirePermissions(PERMISSIONS.integrationsRead)
  @Get('provider-webhook-events/:id')
  findProviderWebhookEvent(@Param('id') id: string) {
    return this.imports.findProviderWebhookEvent(id);
  }

  @RequirePermissions(PERMISSIONS.integrationsTest)
  @Post('provider-webhook-events/:id/retry')
  retryProviderWebhookEvent(@Param('id') id: string) {
    return this.imports.retryProviderWebhookEvent(id);
  }

  @RequirePermissions(PERMISSIONS.integrationsRead)
  @Get('provider-reconciliation')
  reconcileProviderCallbacks() {
    return this.imports.reconcileProviderCallbacks();
  }

  @RequirePermissions(PERMISSIONS.invoicesValidate)
  @Post(':id/confirm-buyer-approval')
  confirmBuyerApproval(
    @Param('id') id: string,
    @Body()
    body: {
      buyerReference?: string;
      approvalReference?: string;
      source?: string;
    },
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.imports.confirmBuyerApproval(id, body, user?.id);
  }

  @RequirePermissions(PERMISSIONS.invoicesValidate)
  @Post(':id/validate-einvoicing')
  validateEInvoicing(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.imports.runEInvoicingValidation(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.invoicesValidate)
  @Post(':id/run-duplicate-check')
  runDuplicateCheck(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.imports.runDuplicateCheck(id, user?.id);
  }

  @RequirePermissions(PERMISSIONS.invoiceRead)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoices.findOne(id);
  }

  @RequirePermissions(PERMISSIONS.invoiceUpdate)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoices.update(id, dto);
  }

  @RequirePermissions(PERMISSIONS.invoiceApprove)
  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.invoices.approve(id);
  }

  @RequirePermissions(PERMISSIONS.invoiceDelete)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.invoices.remove(id);
  }
}
