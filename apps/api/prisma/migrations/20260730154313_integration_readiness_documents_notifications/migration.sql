-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentStatus" ADD VALUE 'ACTIVE';
ALTER TYPE "DocumentStatus" ADD VALUE 'PENDING_VERIFICATION';
ALTER TYPE "DocumentStatus" ADD VALUE 'REJECTED';
ALTER TYPE "DocumentStatus" ADD VALUE 'DELETED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "NotificationStatus" ADD VALUE 'RETRYING';

-- AlterTable
ALTER TABLE "DocumentRecord" ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "fileKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "fileName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "originalFileName" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "storageProvider" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN     "uploadedById" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "IntegrationConnection" ADD COLUMN     "authType" TEXT,
ADD COLUMN     "configJson" JSONB,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "credentialsJson" JSONB,
ADD COLUMN     "environment" TEXT NOT NULL DEFAULT 'SANDBOX',
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "lastFailedAt" TIMESTAMP(3),
ADD COLUMN     "lastSuccessfulAt" TIMESTAMP(3),
ADD COLUMN     "lastTestedAt" TIMESTAMP(3),
ADD COLUMN     "providerKey" TEXT NOT NULL DEFAULT 'mock',
ALTER COLUMN "systemType" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'DISABLED';

-- AlterTable
ALTER TABLE "NotificationLog" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN     "message" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "recipientUserId" TEXT,
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "subject" TEXT,
ALTER COLUMN "templateKey" DROP NOT NULL,
ALTER COLUMN "recipient" SET DEFAULT '';

-- CreateTable
CREATE TABLE "IntegrationLog" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT,
    "providerType" TEXT NOT NULL,
    "providerKey" TEXT,
    "direction" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "requestJson" JSONB,
    "responseJson" JSONB,
    "status" TEXT NOT NULL,
    "statusCode" INTEGER,
    "errorMessage" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "payloadJson" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrationLog_providerType_providerKey_idx" ON "IntegrationLog"("providerType", "providerKey");

-- CreateIndex
CREATE INDEX "IntegrationLog_status_createdAt_idx" ON "IntegrationLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "IntegrationLog_entityType_entityId_idx" ON "IntegrationLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "IntegrationLog_connectionId_idx" ON "IntegrationLog"("connectionId");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_status_idx" ON "WebhookEndpoint"("status");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_nextAttemptAt_idx" ON "WebhookDelivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_eventType_idx" ON "WebhookDelivery"("eventType");

-- CreateIndex
CREATE INDEX "WebhookDelivery_entityType_entityId_idx" ON "WebhookDelivery"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "DocumentRecord_counterpartyId_status_idx" ON "DocumentRecord"("counterpartyId", "status");

-- CreateIndex
CREATE INDEX "DocumentRecord_programmeId_status_idx" ON "DocumentRecord"("programmeId", "status");

-- CreateIndex
CREATE INDEX "DocumentRecord_invoiceId_status_idx" ON "DocumentRecord"("invoiceId", "status");

-- CreateIndex
CREATE INDEX "DocumentRecord_financingTransactionId_status_idx" ON "DocumentRecord"("financingTransactionId", "status");

-- CreateIndex
CREATE INDEX "DocumentRecord_status_createdAt_idx" ON "DocumentRecord"("status", "createdAt");

-- CreateIndex
CREATE INDEX "IntegrationConnection_providerType_providerKey_idx" ON "IntegrationConnection"("providerType", "providerKey");

-- CreateIndex
CREATE INDEX "IntegrationConnection_status_idx" ON "IntegrationConnection"("status");

-- CreateIndex
CREATE INDEX "NotificationLog_status_scheduledAt_idx" ON "NotificationLog"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "NotificationLog_recipientUserId_idx" ON "NotificationLog"("recipientUserId");

-- CreateIndex
CREATE INDEX "NotificationLog_counterpartyId_idx" ON "NotificationLog"("counterpartyId");

-- AddForeignKey
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationLog" ADD CONSTRAINT "IntegrationLog_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
