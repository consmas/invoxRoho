import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  programmeId: string;

  @IsUUID()
  buyerId: string;

  @IsUUID()
  supplierId: string;

  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  ingestionChannel?: string;

  @IsOptional()
  @IsString()
  sourceSystem?: string;

  @IsOptional()
  @IsString()
  purchaseOrderNumber?: string;

  @IsOptional()
  @IsString()
  goodsReceivedNote?: string;

  @IsOptional()
  @IsString()
  currency?: string = 'GHS';

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditNoteAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  disputedAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  financeableAmount?: number;

  @IsDateString()
  issueDate: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  fiscalReference?: string;

  @IsOptional()
  @IsString()
  validationStatus?: string;

  @IsOptional()
  @IsObject()
  validationErrors?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  duplicateCheckStatus?: string;

  @IsOptional()
  @IsString()
  fraudCheckStatus?: string;

  @IsOptional()
  @IsString()
  provenanceHash?: string;

  @IsOptional()
  @IsObject()
  attachmentMetadata?: Record<string, unknown>;
}
