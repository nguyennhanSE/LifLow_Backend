/*
  Warnings:

  - The values [ORDER_NEW] on the enum `OrderSituation` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `courier_company` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `invoice_number` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `situation` on the `orders` table. All the data in the column will be lost.

*/
-- DropForeignKey (if exists)
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_orderer_id_fkey";

-- AlterTable: Drop columns from orders table FIRST (before enum changes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'courier_company') THEN
    ALTER TABLE "orders" DROP COLUMN "courier_company";
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'invoice_number') THEN
    ALTER TABLE "orders" DROP COLUMN "invoice_number";
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'situation') THEN
    ALTER TABLE "orders" DROP COLUMN "situation";
  END IF;
END $$;

-- AlterEnum: Now we can safely modify the enum since orders.situation is dropped
DO $$
BEGIN
  -- Handle case where OrderSituation_new exists but wasn't renamed (partial migration)
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderSituation_new') AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderSituation') THEN
    -- Check if order_groups.situation is still using old type
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'order_groups' 
      AND column_name = 'situation' 
      AND udt_name != 'OrderSituation_new'
    ) THEN
      -- Need to convert to OrderSituation_new first
      ALTER TABLE "public"."order_groups" ALTER COLUMN "situation" DROP DEFAULT;
      -- First, update any ORDER_NEW values to ORDER_PAYMENT_PENDING (if still using old type)
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_groups' AND column_name = 'situation' AND udt_name = 'OrderSituation') THEN
        UPDATE "order_groups" SET "situation" = 'ORDER_PAYMENT_PENDING'::text::"OrderSituation" 
        WHERE "situation"::text = 'ORDER_NEW';
      END IF;
      -- Now convert enum values to new type
      ALTER TABLE "order_groups" ALTER COLUMN "situation" TYPE "OrderSituation_new" USING ("situation"::text::"OrderSituation_new");
    END IF;
    -- Just rename the new type to OrderSituation
    ALTER TYPE "OrderSituation_new" RENAME TO "OrderSituation";
    ALTER TABLE "order_groups" ALTER COLUMN "situation" SET DEFAULT 'ORDER_PAYMENT_PENDING';
  -- Normal case: OrderSituation exists and needs to be changed
  ELSIF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderSituation') THEN
    -- Create new enum type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderSituation_new') THEN
      CREATE TYPE "OrderSituation_new" AS ENUM ('ORDER_PAYMENT_PENDING', 'ORDER_PAYMENT_COMPLETED', 'ORDER_IN_PREPARE', 'ORDER_BEING_SHIPPED', 'ORDER_SHIPPED', 'ORDER_CANCELLED', 'ORDER_RETURNED');
    END IF;
    
    -- Alter order_groups table
    ALTER TABLE "public"."order_groups" ALTER COLUMN "situation" DROP DEFAULT;
    -- First, update any ORDER_NEW values to ORDER_PAYMENT_PENDING (as text)
    UPDATE "order_groups" SET "situation" = 'ORDER_PAYMENT_PENDING'::text::"OrderSituation" 
    WHERE "situation"::text = 'ORDER_NEW';
    -- Now convert enum values to new type
    ALTER TABLE "order_groups" ALTER COLUMN "situation" TYPE "OrderSituation_new" USING ("situation"::text::"OrderSituation_new");
    
    -- Rename types
    ALTER TYPE "OrderSituation" RENAME TO "OrderSituation_old";
    ALTER TYPE "OrderSituation_new" RENAME TO "OrderSituation";
    
    -- Drop old type
    DROP TYPE IF EXISTS "public"."OrderSituation_old";
    
    -- Set default
    ALTER TABLE "order_groups" ALTER COLUMN "situation" SET DEFAULT 'ORDER_PAYMENT_PENDING';
  END IF;
END $$;

-- AlterTable: Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_groups' AND column_name = 'courier_company') THEN
    ALTER TABLE "order_groups" ADD COLUMN "courier_company" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_groups' AND column_name = 'invoice_number') THEN
    ALTER TABLE "order_groups" ADD COLUMN "invoice_number" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_groups' AND column_name = 'orderer_id') THEN
    ALTER TABLE "order_groups" ADD COLUMN "orderer_id" TEXT;
  END IF;
END $$;

ALTER TABLE "order_groups" ALTER COLUMN "situation" SET DEFAULT 'ORDER_PAYMENT_PENDING';

-- AddForeignKey (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'order_groups_orderer_id_fkey'
  ) THEN
    ALTER TABLE "order_groups" ADD CONSTRAINT "order_groups_orderer_id_fkey" 
    FOREIGN KEY ("orderer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
