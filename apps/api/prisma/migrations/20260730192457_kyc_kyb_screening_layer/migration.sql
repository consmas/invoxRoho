-- AlterTable
ALTER TABLE "Counterparty" ADD COLUMN     "adverseMediaStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "complianceNotes" TEXT,
ADD COLUMN     "complianceReviewStatus" TEXT,
ADD COLUMN     "lastKybCheckAt" TIMESTAMP(3),
ADD COLUMN     "lastScreeningAt" TIMESTAMP(3),
ADD COLUMN     "nextKybReviewAt" TIMESTAMP(3),
ADD COLUMN     "nextScreeningAt" TIMESTAMP(3),
ADD COLUMN     "pepStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "sanctionsStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "screeningStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED';

-- AlterTable
ALTER TABLE "UboRecord" ADD COLUMN     "adverseMediaStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "complianceNotes" TEXT,
ADD COLUMN     "complianceReviewStatus" TEXT,
ADD COLUMN     "kycStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "lastKycCheckAt" TIMESTAMP(3),
ADD COLUMN     "lastScreeningAt" TIMESTAMP(3),
ADD COLUMN     "nextKycReviewAt" TIMESTAMP(3),
ADD COLUMN     "nextScreeningAt" TIMESTAMP(3),
ADD COLUMN     "pepStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "sanctionsStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED';

-- CreateTable
CREATE TABLE "ComplianceCheck" (
    "id" TEXT NOT NULL,
    "counterpartyId" TEXT,
    "uboRecordId" TEXT,
    "checkType" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "providerReference" TEXT,
    "status" TEXT NOT NULL,
    "normalizedResult" TEXT NOT NULL,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "riskLevel" TEXT,
    "reason" TEXT,
    "requestJson" JSONB,
    "responseJson" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewDecision" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComplianceCheck_counterpartyId_checkType_idx" ON "ComplianceCheck"("counterpartyId", "checkType");

-- CreateIndex
CREATE INDEX "ComplianceCheck_uboRecordId_checkType_idx" ON "ComplianceCheck"("uboRecordId", "checkType");

-- CreateIndex
CREATE INDEX "ComplianceCheck_status_checkedAt_idx" ON "ComplianceCheck"("status", "checkedAt");

-- CreateIndex
CREATE INDEX "ComplianceCheck_normalizedResult_idx" ON "ComplianceCheck"("normalizedResult");

-- CreateIndex
CREATE INDEX "ComplianceCheck_reviewRequired_idx" ON "ComplianceCheck"("reviewRequired");

-- AddForeignKey
ALTER TABLE "ComplianceCheck" ADD CONSTRAINT "ComplianceCheck_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceCheck" ADD CONSTRAINT "ComplianceCheck_uboRecordId_fkey" FOREIGN KEY ("uboRecordId") REFERENCES "UboRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceCheck" ADD CONSTRAINT "ComplianceCheck_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
