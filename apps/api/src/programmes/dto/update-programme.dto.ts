import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  DayCountConvention,
  DiscountMethod,
  OnboardingStatus,
  ProductType,
  ProgrammeMode,
  ProgrammeStatus,
} from '@prisma/client';

export class UpdateProgrammeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @IsOptional()
  @IsEnum(ProgrammeMode)
  mode?: ProgrammeMode;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(ProgrammeStatus)
  status?: ProgrammeStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsEnum(OnboardingStatus)
  eligibilityCounterpartyStatus?: OnboardingStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumInvoiceAgeDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maximumInvoiceAgeDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxTenorDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumInvoiceAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maximumInvoiceAmount?: number;

  @IsOptional()
  excludedCounterpartyIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  programmeLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  anchorLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  supplierLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  funderLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  concentrationCapPercent?: number;

  @IsOptional()
  @IsString()
  referenceRateSource?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  referenceRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  funderSpread?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  annualDiscountRate?: number;

  @IsOptional()
  @IsEnum(DayCountConvention)
  dayCountConvention?: DayCountConvention;

  @IsOptional()
  @IsEnum(DiscountMethod)
  discountMethod?: DiscountMethod;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  platformFeeFlat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  platformFeePercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  arrangementFeeFlat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  servicingFeePercent?: number;

  @IsOptional()
  @IsObject()
  approvalWorkflow?: Record<string, unknown>;

  @IsOptional()
  requiredDocuments?: string[];

  @IsOptional()
  @IsBoolean()
  eSignRequired?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  workflowSlaHours?: number;

  @IsOptional()
  @IsObject()
  eligibilityRules?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  limitRules?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  pricingRules?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  sandboxAssumptions?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  whiteLabelName?: string;

  @IsOptional()
  @IsString()
  brandPrimaryColor?: string;

  @IsOptional()
  @IsString()
  brandLogoUrl?: string;

  @IsOptional()
  @IsString()
  termsUrl?: string;

  @IsOptional()
  @IsString()
  configurationNotes?: string;
}
