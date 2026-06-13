/*
  Warnings:

  - You are about to drop the column `coupon_used` on the `order_groups` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "order_groups" DROP COLUMN "coupon_used";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "coupon_used" TEXT[],
ADD COLUMN     "discount_amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "product_client_id" TEXT;
