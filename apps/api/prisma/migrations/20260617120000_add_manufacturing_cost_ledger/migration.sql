CREATE TABLE "ManufacturingCostLedgerEntry" (
  "id" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "productionOrderId" TEXT,
  "expenseId" TEXT,
  "expenseBucket" TEXT NOT NULL,
  "allocationBasis" TEXT NOT NULL DEFAULT 'PRODUCTION_BASE_COST',
  "baseCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "allocatedOverhead" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "fullyAbsorbedCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "overheadRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'NPR',
  "source" TEXT NOT NULL DEFAULT 'OPERATIONS_SUMMARY',
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ManufacturingCostLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManufacturingCostLedgerEntry_periodStart_periodEnd_idx" ON "ManufacturingCostLedgerEntry"("periodStart", "periodEnd");
CREATE INDEX "ManufacturingCostLedgerEntry_productionOrderId_idx" ON "ManufacturingCostLedgerEntry"("productionOrderId");
CREATE INDEX "ManufacturingCostLedgerEntry_expenseId_idx" ON "ManufacturingCostLedgerEntry"("expenseId");
CREATE INDEX "ManufacturingCostLedgerEntry_expenseBucket_idx" ON "ManufacturingCostLedgerEntry"("expenseBucket");

ALTER TABLE "ManufacturingCostLedgerEntry"
  ADD CONSTRAINT "ManufacturingCostLedgerEntry_productionOrderId_fkey"
  FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ManufacturingCostLedgerEntry"
  ADD CONSTRAINT "ManufacturingCostLedgerEntry_expenseId_fkey"
  FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
