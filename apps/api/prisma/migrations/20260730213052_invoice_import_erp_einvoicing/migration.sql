-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "buyerApprovalImportedAt" TIMESTAMP(3),
ADD COLUMN     "buyerApprovalReference" TEXT,
ADD COLUMN     "buyerApprovalSource" TEXT,
ADD COLUMN     "einvoicingCheckedAt" TIMESTAMP(3),
ADD COLUMN     "einvoicingReference" TEXT,
ADD COLUMN     "einvoicingResponseJson" JSONB,
ADD COLUMN     "einvoicingStatus" TEXT NOT NULL DEFAULT 'NOT_CHECKED',
ADD COLUMN     "importBatchId" TEXT,
ADD COLUMN     "sourceType" TEXT;

-- CreateTable
CREATE TABLE "InvoiceImportBatch" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceReference" TEXT,
    "programmeId" TEXT,
    "anchorId" TEXT,
    "uploadedDocumentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "duplicateRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "uploadedById" TEXT,
    "errorSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceImportRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawJson" JSONB NOT NULL,
    "normalizedJson" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "validationErrors" JSONB,
    "duplicateOfInvoiceId" TEXT,
    "createdInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceImportBatch_sourceType_status_idx" ON "InvoiceImportBatch"("sourceType", "status");

-- CreateIndex
CREATE INDEX "InvoiceImportBatch_programmeId_idx" ON "InvoiceImportBatch"("programmeId");

-- CreateIndex
CREATE INDEX "InvoiceImportBatch_anchorId_idx" ON "InvoiceImportBatch"("anchorId");

-- CreateIndex
CREATE INDEX "InvoiceImportBatch_uploadedDocumentId_idx" ON "InvoiceImportBatch"("uploadedDocumentId");

-- CreateIndex
CREATE INDEX "InvoiceImportBatch_uploadedById_idx" ON "InvoiceImportBatch"("uploadedById");

-- CreateIndex
CREATE INDEX "InvoiceImportBatch_createdAt_idx" ON "InvoiceImportBatch"("createdAt");

-- CreateIndex
CREATE INDEX "InvoiceImportRow_batchId_status_idx" ON "InvoiceImportRow"("batchId", "status");

-- CreateIndex
CREATE INDEX "InvoiceImportRow_duplicateOfInvoiceId_idx" ON "InvoiceImportRow"("duplicateOfInvoiceId");

-- CreateIndex
CREATE INDEX "InvoiceImportRow_createdInvoiceId_idx" ON "InvoiceImportRow"("createdInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceImportRow_batchId_rowNumber_key" ON "InvoiceImportRow"("batchId", "rowNumber");

-- CreateIndex
CREATE INDEX "Invoice_importBatchId_idx" ON "Invoice"("importBatchId");

-- CreateIndex
CREATE INDEX "Invoice_externalReference_idx" ON "Invoice"("externalReference");

-- CreateIndex
CREATE INDEX "Invoice_einvoicingStatus_idx" ON "Invoice"("einvoicingStatus");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "InvoiceImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceImportBatch" ADD CONSTRAINT "InvoiceImportBatch_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceImportBatch" ADD CONSTRAINT "InvoiceImportBatch_anchorId_fkey" FOREIGN KEY ("anchorId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceImportBatch" ADD CONSTRAINT "InvoiceImportBatch_uploadedDocumentId_fkey" FOREIGN KEY ("uploadedDocumentId") REFERENCES "DocumentRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceImportBatch" ADD CONSTRAINT "InvoiceImportBatch_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceImportRow" ADD CONSTRAINT "InvoiceImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "InvoiceImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceImportRow" ADD CONSTRAINT "InvoiceImportRow_duplicateOfInvoiceId_fkey" FOREIGN KEY ("duplicateOfInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceImportRow" ADD CONSTRAINT "InvoiceImportRow_createdInvoiceId_fkey" FOREIGN KEY ("createdInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
