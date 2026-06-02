-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "panVatNumber" TEXT,
ADD COLUMN     "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updatedBy" INTEGER;

-- CreateIndex
CREATE INDEX "Supplier_phone_idx" ON "Supplier"("phone");

-- CreateIndex
CREATE INDEX "Supplier_email_idx" ON "Supplier"("email");

-- CreateIndex
CREATE INDEX "Supplier_panVatNumber_idx" ON "Supplier"("panVatNumber");
