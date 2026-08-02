-- DropForeignKey
ALTER TABLE "AiAnomalySignal" DROP CONSTRAINT "AiAnomalySignal_counterpartyId_fkey";

-- DropForeignKey
ALTER TABLE "AiAnomalySignal" DROP CONSTRAINT "AiAnomalySignal_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "AiAnomalySignal" DROP CONSTRAINT "AiAnomalySignal_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "DynamicDiscountingOffer" DROP CONSTRAINT "DynamicDiscountingOffer_buyerId_fkey";

-- DropForeignKey
ALTER TABLE "DynamicDiscountingOffer" DROP CONSTRAINT "DynamicDiscountingOffer_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "DynamicDiscountingOffer" DROP CONSTRAINT "DynamicDiscountingOffer_programmeId_fkey";

-- DropForeignKey
ALTER TABLE "DynamicDiscountingOffer" DROP CONSTRAINT "DynamicDiscountingOffer_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "EsgScorecard" DROP CONSTRAINT "EsgScorecard_counterpartyId_fkey";

-- DropForeignKey
ALTER TABLE "EsgScorecard" DROP CONSTRAINT "EsgScorecard_programmeId_fkey";

-- DropForeignKey
ALTER TABLE "FunderMarketplaceBid" DROP CONSTRAINT "FunderMarketplaceBid_financingTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "FunderMarketplaceBid" DROP CONSTRAINT "FunderMarketplaceBid_funderId_fkey";

-- DropForeignKey
ALTER TABLE "FunderMarketplaceBid" DROP CONSTRAINT "FunderMarketplaceBid_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "InvestorReportSnapshot" DROP CONSTRAINT "InvestorReportSnapshot_counterpartyId_fkey";

-- DropForeignKey
ALTER TABLE "InvestorReportSnapshot" DROP CONSTRAINT "InvestorReportSnapshot_investorRecordId_fkey";

-- DropForeignKey
ALTER TABLE "ReceivablesFacility" DROP CONSTRAINT "ReceivablesFacility_debtorId_fkey";

-- DropForeignKey
ALTER TABLE "ReceivablesFacility" DROP CONSTRAINT "ReceivablesFacility_programmeId_fkey";

-- DropForeignKey
ALTER TABLE "ReceivablesFacility" DROP CONSTRAINT "ReceivablesFacility_supplierId_fkey";

-- DropIndex
DROP INDEX "AiAnomalySignal_counterpartyId_idx";

-- DropIndex
DROP INDEX "AiAnomalySignal_invoiceId_idx";

-- DropIndex
DROP INDEX "AiAnomalySignal_paymentId_idx";

-- DropIndex
DROP INDEX "AiAnomalySignal_severity_status_idx";

-- DropIndex
DROP INDEX "AuditLog_actorUserId_createdAt_idx";

-- DropIndex
DROP INDEX "AuditLog_entityType_entityId_createdAt_idx";

-- DropIndex
DROP INDEX "DynamicDiscountingOffer_invoiceId_idx";

-- DropIndex
DROP INDEX "DynamicDiscountingOffer_status_createdAt_idx";

-- DropIndex
DROP INDEX "EsgScorecard_programmeId_idx";

-- DropIndex
DROP INDEX "EsgScorecard_status_asOfDate_idx";

-- DropIndex
DROP INDEX "FunderMarketplaceBid_invoiceId_idx";

-- DropIndex
DROP INDEX "FunderMarketplaceBid_participationStatus_createdAt_idx";

-- DropIndex
DROP INDEX "InvestorReportSnapshot_counterpartyId_idx";

-- DropIndex
DROP INDEX "InvestorReportSnapshot_status_generatedAt_idx";

-- DropIndex
DROP INDEX "ReceivablesFacility_debtorId_idx";

-- DropIndex
DROP INDEX "ReceivablesFacility_status_createdAt_idx";
