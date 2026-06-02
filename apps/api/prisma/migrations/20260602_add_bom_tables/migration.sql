-- Create BillOfMaterials and BOMItem tables
CREATE TABLE IF NOT EXISTS "BillOfMaterials" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "garmentStyle" TEXT NOT NULL,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "BOMItem" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "bomId" TEXT NOT NULL REFERENCES "BillOfMaterials"("id") ON DELETE CASCADE,
  "rawMaterialId" TEXT NOT NULL REFERENCES "RawMaterial"("id") ON DELETE CASCADE,
  "consumption" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "yield" DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS "idx_bomitem_rawmaterial" ON "BOMItem" ("rawMaterialId");
