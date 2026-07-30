-- CreateTable
CREATE TABLE "ProviderWebhookEvent" (
    "id" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventReference" TEXT NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "entityType" TEXT,
    "entityId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextAttemptAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "reconciliationStatus" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "reconciliationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderWebhookEvent_eventReference_key" ON "ProviderWebhookEvent"("eventReference");

-- CreateIndex
CREATE INDEX "ProviderWebhookEvent_providerType_status_idx" ON "ProviderWebhookEvent"("providerType", "status");

-- CreateIndex
CREATE INDEX "ProviderWebhookEvent_eventType_status_idx" ON "ProviderWebhookEvent"("eventType", "status");

-- CreateIndex
CREATE INDEX "ProviderWebhookEvent_entityType_entityId_idx" ON "ProviderWebhookEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ProviderWebhookEvent_reconciliationStatus_createdAt_idx" ON "ProviderWebhookEvent"("reconciliationStatus", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderWebhookEvent_nextAttemptAt_status_idx" ON "ProviderWebhookEvent"("nextAttemptAt", "status");
