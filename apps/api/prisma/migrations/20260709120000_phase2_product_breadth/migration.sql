ALTER TYPE "ProductType" ADD VALUE IF NOT EXISTS 'DYNAMIC_DISCOUNTING';
ALTER TYPE "ProductType" ADD VALUE IF NOT EXISTS 'RECEIVABLES_FINANCE';
ALTER TYPE "ProductType" ADD VALUE IF NOT EXISTS 'FACTORING';
ALTER TYPE "ProductType" ADD VALUE IF NOT EXISTS 'INVOICE_DISCOUNTING';

CREATE TABLE "DynamicDiscountingOffer" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT,
    "buyerId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "invoiceAmount" DECIMAL(65,30) NOT NULL,
    "buyerCashAvailable" DECIMAL(65,30),
    "discountModel" TEXT NOT NULL,
    "targetYield" DECIMAL(65,30),
    "discountRate" DECIMAL(65,30) NOT NULL,
    "discountAmount" DECIMAL(65,30) NOT NULL,
    "netPaymentAmount" DECIMAL(65,30) NOT NULL,
    "daysAccelerated" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFERED',
    "requestedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rulesJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicDiscountingOffer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReceivablesFacility" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT,
    "supplierId" TEXT NOT NULL,
    "debtorId" TEXT,
    "facilityType" TEXT NOT NULL,
    "recourseType" TEXT NOT NULL,
    "disclosed" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "facilityLimit" DECIMAL(65,30) NOT NULL,
    "advanceRate" DECIMAL(65,30) NOT NULL,
    "reserveRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "utilisedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "assignmentNoticeStatus" TEXT,
    "lockboxAccount" TEXT,
    "eligibilityRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceivablesFacility_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FunderMarketplaceBid" (
    "id" TEXT NOT NULL,
    "financingTransactionId" TEXT,
    "invoiceId" TEXT,
    "funderId" TEXT NOT NULL,
    "bidType" TEXT NOT NULL DEFAULT 'PARTICIPATION',
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "offeredAmount" DECIMAL(65,30) NOT NULL,
    "minYield" DECIMAL(65,30),
    "maxTenorDays" INTEGER,
    "participationStatus" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "validUntil" TIMESTAMP(3),
    "conditionsJson" JSONB,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunderMarketplaceBid_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EsgScorecard" (
    "id" TEXT NOT NULL,
    "counterpartyId" TEXT NOT NULL,
    "programmeId" TEXT,
    "provider" TEXT,
    "score" DECIMAL(65,30) NOT NULL,
    "tier" TEXT,
    "asOfDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kpiJson" JSONB,
    "evidenceJson" JSONB,
    "pricingAdjustmentBps" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EsgScorecard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "systemType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIGURED',
    "baseUrl" TEXT,
    "credentialsRef" TEXT,
    "idempotencyKey" TEXT,
    "retryPolicyJson" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "circuitState" TEXT NOT NULL DEFAULT 'CLOSED',
    "fallbackMode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiAnomalySignal" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT,
    "paymentId" TEXT,
    "counterpartyId" TEXT,
    "modelName" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "score" DECIMAL(65,30) NOT NULL,
    "rationaleJson" JSONB,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAnomalySignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvestorReportSnapshot" (
    "id" TEXT NOT NULL,
    "investorRecordId" TEXT,
    "counterpartyId" TEXT,
    "reportType" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "navAmount" DECIMAL(65,30),
    "committedCapital" DECIMAL(65,30),
    "drawnCapital" DECIMAL(65,30),
    "distributedCapital" DECIMAL(65,30),
    "grossYield" DECIMAL(65,30),
    "delinquencyRate" DECIMAL(65,30),
    "weightedAverageLifeDays" INTEGER,
    "reportJson" JSONB,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestorReportSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DynamicDiscountingOffer_programmeId_idx" ON "DynamicDiscountingOffer"("programmeId");
CREATE INDEX "DynamicDiscountingOffer_buyerId_idx" ON "DynamicDiscountingOffer"("buyerId");
CREATE INDEX "DynamicDiscountingOffer_supplierId_idx" ON "DynamicDiscountingOffer"("supplierId");
CREATE INDEX "ReceivablesFacility_supplierId_idx" ON "ReceivablesFacility"("supplierId");
CREATE INDEX "ReceivablesFacility_programmeId_idx" ON "ReceivablesFacility"("programmeId");
CREATE INDEX "FunderMarketplaceBid_funderId_idx" ON "FunderMarketplaceBid"("funderId");
CREATE INDEX "FunderMarketplaceBid_financingTransactionId_idx" ON "FunderMarketplaceBid"("financingTransactionId");
CREATE INDEX "EsgScorecard_counterpartyId_idx" ON "EsgScorecard"("counterpartyId");
CREATE INDEX "IntegrationConnection_systemType_idx" ON "IntegrationConnection"("systemType");
CREATE INDEX "AiAnomalySignal_status_idx" ON "AiAnomalySignal"("status");
CREATE INDEX "InvestorReportSnapshot_reportType_idx" ON "InvestorReportSnapshot"("reportType");
