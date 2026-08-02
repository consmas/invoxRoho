-- CreateIndex
CREATE INDEX "AiAnomalySignal_severity_status_idx" ON "AiAnomalySignal"("severity", "status");

-- CreateIndex
CREATE INDEX "AiAnomalySignal_invoiceId_idx" ON "AiAnomalySignal"("invoiceId");

-- CreateIndex
CREATE INDEX "AiAnomalySignal_paymentId_idx" ON "AiAnomalySignal"("paymentId");

-- CreateIndex
CREATE INDEX "AiAnomalySignal_counterpartyId_idx" ON "AiAnomalySignal"("counterpartyId");

-- CreateIndex
CREATE INDEX "DynamicDiscountingOffer_invoiceId_idx" ON "DynamicDiscountingOffer"("invoiceId");

-- CreateIndex
CREATE INDEX "DynamicDiscountingOffer_status_createdAt_idx" ON "DynamicDiscountingOffer"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EsgScorecard_programmeId_idx" ON "EsgScorecard"("programmeId");

-- CreateIndex
CREATE INDEX "EsgScorecard_status_asOfDate_idx" ON "EsgScorecard"("status", "asOfDate");

-- CreateIndex
CREATE INDEX "FunderMarketplaceBid_invoiceId_idx" ON "FunderMarketplaceBid"("invoiceId");

-- CreateIndex
CREATE INDEX "FunderMarketplaceBid_participationStatus_createdAt_idx" ON "FunderMarketplaceBid"("participationStatus", "createdAt");

-- CreateIndex
CREATE INDEX "InvestorReportSnapshot_counterpartyId_idx" ON "InvestorReportSnapshot"("counterpartyId");

-- CreateIndex
CREATE INDEX "InvestorReportSnapshot_status_generatedAt_idx" ON "InvestorReportSnapshot"("status", "generatedAt");

-- CreateIndex
CREATE INDEX "ReceivablesFacility_debtorId_idx" ON "ReceivablesFacility"("debtorId");

-- CreateIndex
CREATE INDEX "ReceivablesFacility_status_createdAt_idx" ON "ReceivablesFacility"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "DynamicDiscountingOffer" ADD CONSTRAINT "DynamicDiscountingOffer_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicDiscountingOffer" ADD CONSTRAINT "DynamicDiscountingOffer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicDiscountingOffer" ADD CONSTRAINT "DynamicDiscountingOffer_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicDiscountingOffer" ADD CONSTRAINT "DynamicDiscountingOffer_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivablesFacility" ADD CONSTRAINT "ReceivablesFacility_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivablesFacility" ADD CONSTRAINT "ReceivablesFacility_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivablesFacility" ADD CONSTRAINT "ReceivablesFacility_debtorId_fkey" FOREIGN KEY ("debtorId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunderMarketplaceBid" ADD CONSTRAINT "FunderMarketplaceBid_financingTransactionId_fkey" FOREIGN KEY ("financingTransactionId") REFERENCES "FinancingTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunderMarketplaceBid" ADD CONSTRAINT "FunderMarketplaceBid_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunderMarketplaceBid" ADD CONSTRAINT "FunderMarketplaceBid_funderId_fkey" FOREIGN KEY ("funderId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsgScorecard" ADD CONSTRAINT "EsgScorecard_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsgScorecard" ADD CONSTRAINT "EsgScorecard_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAnomalySignal" ADD CONSTRAINT "AiAnomalySignal_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAnomalySignal" ADD CONSTRAINT "AiAnomalySignal_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAnomalySignal" ADD CONSTRAINT "AiAnomalySignal_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorReportSnapshot" ADD CONSTRAINT "InvestorReportSnapshot_investorRecordId_fkey" FOREIGN KEY ("investorRecordId") REFERENCES "InvestorRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorReportSnapshot" ADD CONSTRAINT "InvestorReportSnapshot_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
