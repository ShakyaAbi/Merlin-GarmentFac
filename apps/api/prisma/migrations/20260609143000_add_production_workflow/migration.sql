DO $$ BEGIN
  CREATE TYPE "ProductionOrderStatus" AS ENUM ('DRAFT', 'MATERIAL_ISSUED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ProductionOrder" (
  "id" text PRIMARY KEY,
  "orderNumber" text UNIQUE,
  "bomId" text NOT NULL REFERENCES "BillOfMaterials"("id"),
  "finishedGoodId" text NOT NULL REFERENCES "FinishedGoodProduct"("id"),
  "finishedGoodName" text NOT NULL,
  "quantityPlanned" double precision NOT NULL,
  "quantityProduced" double precision NOT NULL DEFAULT 0,
  "status" "ProductionOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "issuedAt" timestamp(3),
  "startedAt" timestamp(3),
  "completedAt" timestamp(3),
  "cancelledAt" timestamp(3),
  "notes" text,
  "createdBy" integer,
  "updatedBy" integer,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ProductionIssueLine" (
  "id" text PRIMARY KEY,
  "productionOrderId" text NOT NULL REFERENCES "ProductionOrder"("id") ON DELETE CASCADE,
  "rawMaterialId" text NOT NULL REFERENCES "RawMaterial"("id"),
  "quantity" double precision NOT NULL,
  "unit" text NOT NULL,
  "bomConsumption" double precision NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ProductionCompletionLine" (
  "id" text PRIMARY KEY,
  "productionOrderId" text NOT NULL REFERENCES "ProductionOrder"("id") ON DELETE CASCADE,
  "finishedGoodId" text NOT NULL REFERENCES "FinishedGoodProduct"("id"),
  "quantity" double precision NOT NULL,
  "unit" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ProductionOrder_bomId_idx" ON "ProductionOrder" ("bomId");
CREATE INDEX IF NOT EXISTS "ProductionOrder_finishedGoodId_idx" ON "ProductionOrder" ("finishedGoodId");
CREATE INDEX IF NOT EXISTS "ProductionOrder_status_idx" ON "ProductionOrder" ("status");
CREATE INDEX IF NOT EXISTS "ProductionIssueLine_productionOrderId_idx" ON "ProductionIssueLine" ("productionOrderId");
CREATE INDEX IF NOT EXISTS "ProductionIssueLine_rawMaterialId_idx" ON "ProductionIssueLine" ("rawMaterialId");
CREATE INDEX IF NOT EXISTS "ProductionCompletionLine_productionOrderId_idx" ON "ProductionCompletionLine" ("productionOrderId");
CREATE INDEX IF NOT EXISTS "ProductionCompletionLine_finishedGoodId_idx" ON "ProductionCompletionLine" ("finishedGoodId");
