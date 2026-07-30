-- CreateEnum
CREATE TYPE "KycTier" AS ENUM ('SIMPLIFIED', 'STANDARD', 'ENHANCED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'VERIFIED', 'FAILED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "ScreeningStatus" AS ENUM ('NOT_SCREENED', 'CLEAR', 'POSSIBLE_MATCH', 'CONFIRMED_MATCH');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('REQUIRED', 'RECEIVED', 'VERIFIED', 'EXPIRED', 'WAIVED');

-- AlterTable
ALTER TABLE "Counterparty"
ADD COLUMN "tradingName" TEXT,
ADD COLUMN "industry" TEXT,
ADD COLUMN "contactEmail" TEXT,
ADD COLUMN "contactPhone" TEXT,
ADD COLUMN "website" TEXT,
ADD COLUMN "ownershipSummary" TEXT,
ADD COLUMN "directorsSummary" TEXT,
ADD COLUMN "onboardingProgress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "kycTier" "KycTier",
ADD COLUMN "kybStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN "identityVerificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN "registryVerificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN "creditBureauStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN "sanctionsScreeningStatus" "ScreeningStatus" NOT NULL DEFAULT 'NOT_SCREENED',
ADD COLUMN "pepScreeningStatus" "ScreeningStatus" NOT NULL DEFAULT 'NOT_SCREENED',
ADD COLUMN "adverseMediaScreeningStatus" "ScreeningStatus" NOT NULL DEFAULT 'NOT_SCREENED',
ADD COLUMN "lastScreenedAt" TIMESTAMP(3),
ADD COLUMN "nextReviewDate" TIMESTAMP(3),
ADD COLUMN "consentAcceptedAt" TIMESTAMP(3),
ADD COLUMN "dataProcessingAgreementAcceptedAt" TIMESTAMP(3),
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "onboardingDecisionReason" TEXT;

-- AlterTable
ALTER TABLE "BankAccount"
ADD COLUMN "paymentInstruction" TEXT,
ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN "verifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UboRecord"
ADD COLUMN "dateOfBirth" TIMESTAMP(3),
ADD COLUMN "address" TEXT,
ADD COLUMN "screeningStatus" "ScreeningStatus" NOT NULL DEFAULT 'NOT_SCREENED';

-- CreateTable
CREATE TABLE "DirectorRecord" (
    "id" TEXT NOT NULL,
    "counterpartyId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nationality" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "idType" TEXT,
    "idNumber" TEXT,
    "roleTitle" TEXT,
    "screeningStatus" "ScreeningStatus" NOT NULL DEFAULT 'NOT_SCREENED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectorRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CounterpartyDocument" (
    "id" TEXT NOT NULL,
    "counterpartyId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'REQUIRED',
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CounterpartyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "counterpartyId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "acceptedBy" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DirectorRecord_counterpartyId_idx" ON "DirectorRecord"("counterpartyId");

-- CreateIndex
CREATE INDEX "CounterpartyDocument_counterpartyId_idx" ON "CounterpartyDocument"("counterpartyId");

-- CreateIndex
CREATE INDEX "ConsentRecord_counterpartyId_idx" ON "ConsentRecord"("counterpartyId");

-- AddForeignKey
ALTER TABLE "DirectorRecord" ADD CONSTRAINT "DirectorRecord_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounterpartyDocument" ADD CONSTRAINT "CounterpartyDocument_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
