-- CreateIndex
CREATE INDEX "AiAnomalySignal_status_idx" ON "AiAnomalySignal"("status");

-- CreateIndex
CREATE INDEX "DynamicDiscountingOffer_programmeId_idx" ON "DynamicDiscountingOffer"("programmeId");

-- CreateIndex
CREATE INDEX "DynamicDiscountingOffer_buyerId_idx" ON "DynamicDiscountingOffer"("buyerId");

-- CreateIndex
CREATE INDEX "DynamicDiscountingOffer_supplierId_idx" ON "DynamicDiscountingOffer"("supplierId");

-- CreateIndex
CREATE INDEX "EsgScorecard_counterpartyId_idx" ON "EsgScorecard"("counterpartyId");

-- CreateIndex
CREATE INDEX "FunderMarketplaceBid_financingTransactionId_idx" ON "FunderMarketplaceBid"("financingTransactionId");

-- CreateIndex
CREATE INDEX "FunderMarketplaceBid_funderId_idx" ON "FunderMarketplaceBid"("funderId");

-- CreateIndex
CREATE INDEX "IntegrationConnection_systemType_idx" ON "IntegrationConnection"("systemType");

-- CreateIndex
CREATE INDEX "InvestorReportSnapshot_reportType_idx" ON "InvestorReportSnapshot"("reportType");

-- CreateIndex
CREATE INDEX "ReceivablesFacility_programmeId_idx" ON "ReceivablesFacility"("programmeId");

-- CreateIndex
CREATE INDEX "ReceivablesFacility_supplierId_idx" ON "ReceivablesFacility"("supplierId");
