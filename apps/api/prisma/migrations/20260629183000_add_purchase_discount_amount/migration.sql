-- Add purchase-level discount amount
ALTER TABLE "Purchase"
ADD COLUMN "discountAmount" NUMERIC(65,30) NOT NULL DEFAULT 0;
