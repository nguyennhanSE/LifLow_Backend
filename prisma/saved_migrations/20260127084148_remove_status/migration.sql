/*
  Warnings:

  - The values [ORDER_IN_PREPARE] on the enum `OrderSituation` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderSituation_new" AS ENUM ('ORDER_PAYMENT_PENDING', 'ORDER_PAYMENT_COMPLETED', 'ORDER_BEING_SHIPPED', 'ORDER_SHIPPED', 'ORDER_CANCELLED', 'ORDER_RETURNED');
ALTER TABLE "public"."order_groups" ALTER COLUMN "situation" DROP DEFAULT;
ALTER TABLE "order_groups" ALTER COLUMN "situation" TYPE "OrderSituation_new" USING ("situation"::text::"OrderSituation_new");
ALTER TYPE "OrderSituation" RENAME TO "OrderSituation_old";
ALTER TYPE "OrderSituation_new" RENAME TO "OrderSituation";
DROP TYPE "public"."OrderSituation_old";
ALTER TABLE "order_groups" ALTER COLUMN "situation" SET DEFAULT 'ORDER_PAYMENT_COMPLETED';
COMMIT;

-- AlterTable
ALTER TABLE "order_groups" ALTER COLUMN "situation" SET DEFAULT 'ORDER_PAYMENT_COMPLETED';
