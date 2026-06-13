/*
  Warnings:

  - You are about to drop the column `cart_item_id` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `item_wise_order_number` on the `orders` table. All the data in the column will be lost.
  - Added the required column `cart_id` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_cart_item_id_fkey";

-- DropIndex
DROP INDEX "orders_cart_item_id_idx";

-- DropIndex
DROP INDEX "orders_cart_item_id_key";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "cart_item_id",
DROP COLUMN "item_wise_order_number",
ADD COLUMN     "cart_id" TEXT NOT NULL,
ADD COLUMN     "order_group_number" TEXT;

-- CreateTable
CREATE TABLE "order_groups" (
    "order_group_number" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "order_groups_order_group_number_key" ON "order_groups"("order_group_number");

-- CreateIndex
CREATE INDEX "order_groups_order_group_number_idx" ON "order_groups"("order_group_number");

-- CreateIndex
CREATE INDEX "orders_cart_id_idx" ON "orders"("cart_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_order_group_number_fkey" FOREIGN KEY ("order_group_number") REFERENCES "order_groups"("order_group_number") ON DELETE SET NULL ON UPDATE CASCADE;
