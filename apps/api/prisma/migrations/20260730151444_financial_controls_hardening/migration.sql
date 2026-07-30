-- CreateIndex
CREATE INDEX "ExposureSnapshot_scope_programmeId_counterpartyId_currency__idx" ON "ExposureSnapshot"("scope", "programmeId", "counterpartyId", "currency", "asOfDate");

-- CreateIndex
CREATE INDEX "LedgerEntry_financingTransactionId_postedAt_idx" ON "LedgerEntry"("financingTransactionId", "postedAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_accountId_postedAt_idx" ON "LedgerEntry"("accountId", "postedAt");

-- CreateIndex
CREATE INDEX "LimitRecord_scope_programmeId_counterpartyId_currency_statu_idx" ON "LimitRecord"("scope", "programmeId", "counterpartyId", "currency", "status");

-- CreateIndex
CREATE INDEX "LimitRecord_expiresAt_idx" ON "LimitRecord"("expiresAt");

-- CreateIndex
CREATE INDEX "MaturityObligation_programmeId_obligorId_status_dueDate_idx" ON "MaturityObligation"("programmeId", "obligorId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "MaturityObligation_financingTransactionId_idx" ON "MaturityObligation"("financingTransactionId");

-- CreateIndex
CREATE INDEX "Payment_financingTransactionId_direction_status_idx" ON "Payment"("financingTransactionId", "direction", "status");

-- CreateIndex
CREATE INDEX "Payment_counterpartyId_status_idx" ON "Payment"("counterpartyId", "status");

-- CreateIndex
CREATE INDEX "Payment_reference_idx" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "ReconciliationItem_status_statementDate_idx" ON "ReconciliationItem"("status", "statementDate");

-- CreateIndex
CREATE INDEX "ReconciliationItem_paymentId_idx" ON "ReconciliationItem"("paymentId");

-- CreateIndex
CREATE INDEX "ReconciliationItem_statementReference_idx" ON "ReconciliationItem"("statementReference");
