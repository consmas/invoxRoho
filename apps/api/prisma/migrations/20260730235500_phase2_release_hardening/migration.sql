CREATE INDEX IF NOT EXISTS "DynamicDiscountingOffer_status_createdAt_idx" ON "DynamicDiscountingOffer"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "DynamicDiscountingOffer_invoiceId_idx" ON "DynamicDiscountingOffer"("invoiceId");
CREATE INDEX IF NOT EXISTS "ReceivablesFacility_status_createdAt_idx" ON "ReceivablesFacility"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ReceivablesFacility_debtorId_idx" ON "ReceivablesFacility"("debtorId");
CREATE INDEX IF NOT EXISTS "FunderMarketplaceBid_participationStatus_createdAt_idx" ON "FunderMarketplaceBid"("participationStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "FunderMarketplaceBid_invoiceId_idx" ON "FunderMarketplaceBid"("invoiceId");
CREATE INDEX IF NOT EXISTS "EsgScorecard_status_asOfDate_idx" ON "EsgScorecard"("status", "asOfDate");
CREATE INDEX IF NOT EXISTS "EsgScorecard_programmeId_idx" ON "EsgScorecard"("programmeId");
CREATE INDEX IF NOT EXISTS "AiAnomalySignal_severity_status_idx" ON "AiAnomalySignal"("severity", "status");
CREATE INDEX IF NOT EXISTS "AiAnomalySignal_invoiceId_idx" ON "AiAnomalySignal"("invoiceId");
CREATE INDEX IF NOT EXISTS "AiAnomalySignal_paymentId_idx" ON "AiAnomalySignal"("paymentId");
CREATE INDEX IF NOT EXISTS "AiAnomalySignal_counterpartyId_idx" ON "AiAnomalySignal"("counterpartyId");
CREATE INDEX IF NOT EXISTS "InvestorReportSnapshot_status_generatedAt_idx" ON "InvestorReportSnapshot"("status", "generatedAt");
CREATE INDEX IF NOT EXISTS "InvestorReportSnapshot_counterpartyId_idx" ON "InvestorReportSnapshot"("counterpartyId");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

ALTER TABLE "DynamicDiscountingOffer"
  ADD CONSTRAINT "DynamicDiscountingOffer_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "DynamicDiscountingOffer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DynamicDiscountingOffer_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DynamicDiscountingOffer_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "DynamicDiscountingOffer_amounts_check" CHECK ("invoiceAmount" >= 0 AND "discountAmount" >= 0 AND "netPaymentAmount" >= 0 AND "daysAccelerated" >= 0);

ALTER TABLE "ReceivablesFacility"
  ADD CONSTRAINT "ReceivablesFacility_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ReceivablesFacility_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ReceivablesFacility_debtorId_fkey" FOREIGN KEY ("debtorId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ReceivablesFacility_amounts_check" CHECK ("facilityLimit" >= 0 AND "advanceRate" >= 0 AND "reserveRate" >= 0 AND "utilisedAmount" >= 0 AND "utilisedAmount" <= "facilityLimit");

ALTER TABLE "FunderMarketplaceBid"
  ADD CONSTRAINT "FunderMarketplaceBid_financingTransactionId_fkey" FOREIGN KEY ("financingTransactionId") REFERENCES "FinancingTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "FunderMarketplaceBid_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "FunderMarketplaceBid_funderId_fkey" FOREIGN KEY ("funderId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "FunderMarketplaceBid_amounts_check" CHECK ("offeredAmount" >= 0 AND ("minYield" IS NULL OR "minYield" >= 0) AND ("maxTenorDays" IS NULL OR "maxTenorDays" >= 0));

ALTER TABLE "EsgScorecard"
  ADD CONSTRAINT "EsgScorecard_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "EsgScorecard_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "EsgScorecard_score_check" CHECK ("score" >= 0 AND "score" <= 100);

ALTER TABLE "AiAnomalySignal"
  ADD CONSTRAINT "AiAnomalySignal_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "AiAnomalySignal_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "AiAnomalySignal_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "AiAnomalySignal_score_check" CHECK ("score" >= 0 AND "score" <= 1);

ALTER TABLE "InvestorReportSnapshot"
  ADD CONSTRAINT "InvestorReportSnapshot_investorRecordId_fkey" FOREIGN KEY ("investorRecordId") REFERENCES "InvestorRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "InvestorReportSnapshot_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "InvestorReportSnapshot_period_check" CHECK ("periodStart" <= "periodEnd");
