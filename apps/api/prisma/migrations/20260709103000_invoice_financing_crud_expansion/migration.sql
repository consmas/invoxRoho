-- AlterTable
ALTER TABLE "Invoice"
ADD COLUMN "externalReference" TEXT,
ADD COLUMN "ingestionChannel" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "sourceSystem" TEXT,
ADD COLUMN "purchaseOrderNumber" TEXT,
ADD COLUMN "goodsReceivedNote" TEXT,
ADD COLUMN "taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "creditNoteAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "disputedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "financeableAmount" DECIMAL(65,30),
ADD COLUMN "approvedByUserId" TEXT,
ADD COLUMN "validationStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "validationErrors" JSONB,
ADD COLUMN "duplicateCheckStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "fraudCheckStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "provenanceHash" TEXT,
ADD COLUMN "attachmentMetadata" JSONB,
ADD COLUMN "cancellationReason" TEXT,
ADD COLUMN "cancelledAt" TIMESTAMP(3);

UPDATE "Invoice"
SET "financeableAmount" = "amount"
WHERE "financeableAmount" IS NULL;

-- AlterTable
ALTER TABLE "FinancingTransaction"
ADD COLUMN "offerReference" TEXT,
ADD COLUMN "referenceRate" DECIMAL(65,30),
ADD COLUMN "spreadRate" DECIMAL(65,30),
ADD COLUMN "arrangementFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "servicingFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "buyerObligationAmount" DECIMAL(65,30),
ADD COLUMN "funderSettlementAmount" DECIMAL(65,30),
ADD COLUMN "settlementDate" TIMESTAMP(3),
ADD COLUMN "offerExpiresAt" TIMESTAMP(3),
ADD COLUMN "autoAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "discountBreakdown" JSONB,
ADD COLUMN "feeBreakdown" JSONB,
ADD COLUMN "allocationRule" TEXT,
ADD COLUMN "assignmentReference" TEXT,
ADD COLUMN "trueSaleStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "recourseAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "adjustmentAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "cancellationReason" TEXT;

UPDATE "FinancingTransaction"
SET "buyerObligationAmount" = "invoiceAmount",
    "funderSettlementAmount" = "invoiceAmount"
WHERE "buyerObligationAmount" IS NULL
   OR "funderSettlementAmount" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "FinancingTransaction_offerReference_key" ON "FinancingTransaction"("offerReference");
