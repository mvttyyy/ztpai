-- AlterTable - Add optional slug column
ALTER TABLE "loops" ADD COLUMN "slug" TEXT;

-- Generate slugs for existing loops based on title
UPDATE "loops" SET "slug" = 
  LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  ) || '-' || SUBSTRING(id, 1, 8);

-- Make slug required and unique
ALTER TABLE "loops" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "loops_slug_key" ON "loops"("slug");
