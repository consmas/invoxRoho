-- AlterEnum
ALTER TYPE "ReconciliationStatus" ADD VALUE IF NOT EXISTS 'MISMATCHED';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "provider" TEXT,
ADD COLUMN "providerReference" TEXT,
ADD COLUMN "externalTransactionId" TEXT,
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "webhookReference" TEXT,
ADD COLUMN "providerStatus" TEXT,
ADD COLUMN "providerResponseJson" JSONB,
ADD COLUMN "initiatedById" TEXT,
ADD COLUMN "verifiedById" TEXT,
ADD COLUMN "approvedById" TEXT,
ADD COLUMN "initiatedAt" TIMESTAMP(3),
ADD COLUMN "verifiedAt" TIMESTAMP(3),
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "webhookReceivedAt" TIMESTAMP(3),
ADD COLUMN "lastProviderCheckAt" TIMESTAMP(3),
ADD COLUMN "failureReason" TEXT,
ADD COLUMN "reversalReason" TEXT,
ADD COLUMN "metadata" JSONB;

-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN "paymentId" TEXT;

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventReference" TEXT NOT NULL,
    "paymentId" TEXT,
    "providerReference" TEXT,
    "payloadJson" JSONB NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_providerReference_idx" ON "Payment"("providerReference");

-- CreateIndex
CREATE INDEX "Payment_provider_providerStatus_idx" ON "Payment"("provider", "providerStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_eventReference_key" ON "PaymentWebhookEvent"("eventReference");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_provider_eventType_idx" ON "PaymentWebhookEvent"("provider", "eventType");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_paymentId_idx" ON "PaymentWebhookEvent"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_providerReference_idx" ON "PaymentWebhookEvent"("providerReference");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_processed_receivedAt_idx" ON "PaymentWebhookEvent"("processed", "receivedAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_paymentId_postedAt_idx" ON "LedgerEntry"("paymentId", "postedAt");

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
