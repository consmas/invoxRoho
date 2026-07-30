-- CreateEnum
CREATE TYPE "LimitScope" AS ENUM ('FUNDER', 'PROGRAMME', 'ANCHOR', 'SUPPLIER', 'SECTOR', 'COUNTRY', 'TENOR', 'SINGLE_NAME');

-- CreateEnum
CREATE TYPE "DecisionOutcome" AS ENUM ('APPROVED', 'DECLINED', 'REFERRED');

-- CreateEnum
CREATE TYPE "ObligationStatus" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'PAID', 'PAST_DUE', 'DEFAULTED', 'RESTRUCTURED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('UNMATCHED', 'PARTIALLY_MATCHED', 'MATCHED', 'INVESTIGATING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "WorkflowCaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'IN_APP', 'WHATSAPP', 'MOBILE_MONEY', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DELIVERED');

-- DropIndex
DROP INDEX "ConsentRecord_counterpartyId_idx";

-- DropIndex
DROP INDEX "CounterpartyDocument_counterpartyId_idx";

-- DropIndex
DROP INDEX "DirectorRecord_counterpartyId_idx";

-- CreateTable
CREATE TABLE "LimitRecord" (
    "id" TEXT NOT NULL,
    "scope" "LimitScope" NOT NULL,
    "programmeId" TEXT,
    "counterpartyId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "limitAmount" DECIMAL(65,30) NOT NULL,
    "utilisedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "reservedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "availableAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "covenantJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LimitRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExposureSnapshot" (
    "id" TEXT NOT NULL,
    "scope" "LimitScope" NOT NULL,
    "programmeId" TEXT,
    "counterpartyId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "exposureAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "availableLimit" DECIMAL(65,30),
    "asOfDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExposureSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditDecision" (
    "id" TEXT NOT NULL,
    "counterpartyId" TEXT,
    "programmeId" TEXT,
    "financingTransactionId" TEXT,
    "score" DECIMAL(65,30),
    "rating" "RiskRating",
    "outcome" "DecisionOutcome" NOT NULL,
    "reasonCodes" JSONB,
    "rulesFired" JSONB,
    "approvedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunderProfile" (
    "id" TEXT NOT NULL,
    "counterpartyId" TEXT NOT NULL,
    "currencies" JSONB,
    "minTenorDays" INTEGER,
    "maxTenorDays" INTEGER,
    "committedCapacity" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "utilisedCapacity" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "pricingFloor" DECIMAL(65,30),
    "concentrationPreference" JSONB,
    "eligibilityRules" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceProvenanceRecord" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceReference" TEXT,
    "payloadHash" TEXT,
    "payloadJson" JSONB,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceProvenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaturityObligation" (
    "id" TEXT NOT NULL,
    "financingTransactionId" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "obligorId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "principalAmount" DECIMAL(65,30) NOT NULL,
    "feeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "interestAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "outstandingAmount" DECIMAL(65,30) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ObligationStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaturityObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentApplication" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "appliedAmount" DECIMAL(65,30) NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationItem" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "ledgerEntryId" TEXT,
    "statementReference" TEXT,
    "counterpartyName" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "statementAmount" DECIMAL(65,30) NOT NULL,
    "statementDate" TIMESTAMP(3) NOT NULL,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matchConfidence" DECIMAL(65,30),
    "investigationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorRecord" (
    "id" TEXT NOT NULL,
    "counterpartyId" TEXT NOT NULL,
    "commitmentAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "drawnAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "distributionAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "navAmount" DECIMAL(65,30),
    "valuationDate" TIMESTAMP(3),
    "reportingPackJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestorRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRecord" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DocumentStatus" NOT NULL DEFAULT 'REQUIRED',
    "counterpartyId" TEXT,
    "programmeId" TEXT,
    "invoiceId" TEXT,
    "financingTransactionId" TEXT,
    "storageUrl" TEXT,
    "metadataJson" JSONB,
    "eSignRequired" BOOLEAN NOT NULL DEFAULT false,
    "signedAt" TIMESTAMP(3),
    "retentionUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowCase" (
    "id" TEXT NOT NULL,
    "caseType" TEXT NOT NULL,
    "status" "WorkflowCaseStatus" NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "assignedRole" TEXT,
    "assignedUserId" TEXT,
    "counterpartyId" TEXT,
    "programmeId" TEXT,
    "financingTransactionId" TEXT,
    "dueAt" TIMESTAMP(3),
    "slaHours" INTEGER,
    "historyJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "counterpartyId" TEXT,
    "userId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "templateKey" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "payloadJson" JSONB,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "parametersJson" JSONB,
    "scheduleJson" JSONB,
    "exportFormats" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FunderProfile_counterpartyId_key" ON "FunderProfile"("counterpartyId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportDefinition_code_key" ON "ReportDefinition"("code");

-- AddForeignKey
ALTER TABLE "LimitRecord" ADD CONSTRAINT "LimitRecord_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LimitRecord" ADD CONSTRAINT "LimitRecord_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExposureSnapshot" ADD CONSTRAINT "ExposureSnapshot_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExposureSnapshot" ADD CONSTRAINT "ExposureSnapshot_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunderProfile" ADD CONSTRAINT "FunderProfile_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceProvenanceRecord" ADD CONSTRAINT "InvoiceProvenanceRecord_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaturityObligation" ADD CONSTRAINT "MaturityObligation_financingTransactionId_fkey" FOREIGN KEY ("financingTransactionId") REFERENCES "FinancingTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaturityObligation" ADD CONSTRAINT "MaturityObligation_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentApplication" ADD CONSTRAINT "PaymentApplication_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentApplication" ADD CONSTRAINT "PaymentApplication_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "MaturityObligation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationItem" ADD CONSTRAINT "ReconciliationItem_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorRecord" ADD CONSTRAINT "InvestorRecord_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_financingTransactionId_fkey" FOREIGN KEY ("financingTransactionId") REFERENCES "FinancingTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowCase" ADD CONSTRAINT "WorkflowCase_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowCase" ADD CONSTRAINT "WorkflowCase_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowCase" ADD CONSTRAINT "WorkflowCase_financingTransactionId_fkey" FOREIGN KEY ("financingTransactionId") REFERENCES "FinancingTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
