-- Step 1: Add column as nullable first
ALTER TABLE "product_inquiry_answers" ADD COLUMN "author_id" TEXT;

-- Step 2: Delete existing rows (since they don't have author_id)
DELETE FROM "product_inquiry_answers";

-- Step 3: Make column NOT NULL and add foreign key
ALTER TABLE "product_inquiry_answers" ALTER COLUMN "author_id" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "product_inquiry_answers" ADD CONSTRAINT "product_inquiry_answers_author_id_fkey" 
    FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;