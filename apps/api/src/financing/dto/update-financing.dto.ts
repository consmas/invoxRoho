import { FinancingStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateFinancingDto {
  @IsOptional()
  @IsString()
  offerReference?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  invoiceAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  annualRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  referenceRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  spreadRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  platformFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  arrangementFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  servicingFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  netProceeds?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  buyerObligationAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  funderSettlementAmount?: number;

  @IsOptional()
  @IsDateString()
  maturityDate?: string;

  @IsOptional()
  @IsDateString()
  settlementDate?: string;

  @IsOptional()
  @IsDateString()
  offerExpiresAt?: string;

  @IsOptional()
  @IsEnum(FinancingStatus)
  status?: FinancingStatus;

  @IsOptional()
  @IsBoolean()
  autoAccepted?: boolean;

  @IsOptional()
  @IsObject()
  discountBreakdown?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  feeBreakdown?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  allocationRule?: string;

  @IsOptional()
  @IsString()
  assignmentReference?: string;

  @IsOptional()
  @IsString()
  trueSaleStatus?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  recourseAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  adjustmentAmount?: number;

  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
