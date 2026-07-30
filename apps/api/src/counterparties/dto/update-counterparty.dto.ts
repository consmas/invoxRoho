import { Type } from 'class-transformer';
import {
  CounterpartyType,
  KycTier,
  OnboardingStatus,
  RiskRating,
  ScreeningStatus,
  VerificationStatus,
} from '@prisma/client';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  CreateBankAccountDto,
  CreateConsentRecordDto,
  CreateCounterpartyDocumentDto,
  CreateDirectorRecordDto,
  CreateUboRecordDto,
} from './create-counterparty.dto';

export class UpdateCounterpartyDto {
  @IsOptional()
  @IsEnum(CounterpartyType)
  type?: CounterpartyType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  legalName?: string;

  @IsOptional()
  @IsString()
  tradingName?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  tin?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  ownershipSummary?: string;

  @IsOptional()
  @IsString()
  directorsSummary?: string;

  @IsOptional()
  @IsEnum(OnboardingStatus)
  onboardingStatus?: OnboardingStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  onboardingProgress?: number;

  @IsOptional()
  @IsEnum(RiskRating)
  riskRating?: RiskRating;

  @IsOptional()
  @IsEnum(KycTier)
  kycTier?: KycTier;

  @IsOptional()
  @IsEnum(VerificationStatus)
  kybStatus?: VerificationStatus;

  @IsOptional()
  @IsEnum(VerificationStatus)
  identityVerificationStatus?: VerificationStatus;

  @IsOptional()
  @IsEnum(VerificationStatus)
  registryVerificationStatus?: VerificationStatus;

  @IsOptional()
  @IsEnum(VerificationStatus)
  creditBureauStatus?: VerificationStatus;

  @IsOptional()
  @IsEnum(ScreeningStatus)
  sanctionsScreeningStatus?: ScreeningStatus;

  @IsOptional()
  @IsEnum(ScreeningStatus)
  pepScreeningStatus?: ScreeningStatus;

  @IsOptional()
  @IsEnum(ScreeningStatus)
  adverseMediaScreeningStatus?: ScreeningStatus;

  @IsOptional()
  @IsDateString()
  lastScreenedAt?: string;

  @IsOptional()
  @IsDateString()
  nextReviewDate?: string;

  @IsOptional()
  @IsDateString()
  consentAcceptedAt?: string;

  @IsOptional()
  @IsDateString()
  dataProcessingAgreementAcceptedAt?: string;

  @IsOptional()
  @IsDateString()
  submittedAt?: string;

  @IsOptional()
  @IsDateString()
  approvedAt?: string;

  @IsOptional()
  @IsDateString()
  rejectedAt?: string;

  @IsOptional()
  @IsString()
  onboardingDecisionReason?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBankAccountDto)
  bankAccounts?: CreateBankAccountDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateUboRecordDto)
  uboRecords?: CreateUboRecordDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDirectorRecordDto)
  directors?: CreateDirectorRecordDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCounterpartyDocumentDto)
  documents?: CreateCounterpartyDocumentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConsentRecordDto)
  consentRecords?: CreateConsentRecordDto[];
}
