CREATE TABLE IF NOT EXISTS "ArticleCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "ArticleCategoryStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "ArticleCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ArticleCategory_name_key" ON "ArticleCategory"("name");

ALTER TABLE "FinishedGoodProduct"
ADD COLUMN IF NOT EXISTS "articleCategoryId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'FinishedGoodProduct_articleCategoryId_fkey'
  ) THEN
    ALTER TABLE "FinishedGoodProduct"
    ADD CONSTRAINT "FinishedGoodProduct_articleCategoryId_fkey"
    FOREIGN KEY ("articleCategoryId") REFERENCES "ArticleCategory"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "FinishedGoodProduct_articleCategoryId_idx" ON "FinishedGoodProduct"("articleCategoryId");
