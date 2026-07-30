import { Type } from 'class-transformer';
import {
  CounterpartyType,
  DocumentStatus,
  KycTier,
  RiskRating,
  ScreeningStatus,
  VerificationStatus,
} from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  @MinLength(1)
  bankName: string;

  @IsString()
  @MinLength(1)
  accountName: string;

  @IsString()
  @MinLength(1)
  accountNumber: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  currency?: string = 'GHS';

  @IsOptional()
  @IsString()
  paymentInstruction?: string;

  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateUboRecordDto {
  @IsString()
  @MinLength(1)
  fullName: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  idType?: string;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  ownershipPercentage?: number;

  @IsOptional()
  @IsEnum(ScreeningStatus)
  screeningStatus?: ScreeningStatus;
}

export class CreateDirectorRecordDto {
  @IsString()
  @MinLength(1)
  fullName: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  idType?: string;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsString()
  roleTitle?: string;

  @IsOptional()
  @IsEnum(ScreeningStatus)
  screeningStatus?: ScreeningStatus;
}

export class CreateCounterpartyDocumentDto {
  @IsString()
  @MinLength(1)
  documentType: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateConsentRecordDto {
  @IsString()
  @MinLength(1)
  consentType: string;

  @IsOptional()
  @IsString()
  acceptedBy?: string;

  @IsOptional()
  @IsDateString()
  acceptedAt?: string;
}

export class CreateCounterpartyDto {
  @IsEnum(CounterpartyType)
  type: CounterpartyType;

  @IsString()
  @MinLength(1)
  legalName: string;

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
  country?: string = 'GH';

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
