-- DropIndex
DROP INDEX "Invoice_status_idx";

-- CreateIndex
CREATE INDEX "Invoice_status_createdAt_idx" ON "Invoice"("status", "createdAt");
