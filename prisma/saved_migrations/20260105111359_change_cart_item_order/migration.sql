/*
  Warnings:

  - A unique constraint covering the columns `[cart_item_id]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cart_item_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_cart_item_id_key" ON "orders"("cart_item_id");

-- CreateIndex
CREATE INDEX "orders_cart_item_id_idx" ON "orders"("cart_item_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_item_id_fkey" FOREIGN KEY ("cart_item_id") REFERENCES "cart_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
