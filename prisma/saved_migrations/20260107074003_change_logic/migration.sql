/*
  Warnings:

  - You are about to drop the column `cart_item_status` on the `carts` table. All the data in the column will be lost.
  - Added the required column `discount_amount` to the `order_groups` table without a default value. This is not possible if the table is not empty.
  - Added the required column `final_amount` to the `order_groups` table without a default value. This is not possible if the table is not empty.
  - Added the required column `original_amount` to the `order_groups` table without a default value. This is not possible if the table is not empty.
  - Added the required column `points_used` to the `order_groups` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "carts" DROP COLUMN "cart_item_status";

-- AlterTable
ALTER TABLE "order_groups" ADD COLUMN     "cart_item_ids" TEXT[],
ADD COLUMN     "coupon_used" TEXT[],
ADD COLUMN     "discount_amount" INTEGER NOT NULL,
ADD COLUMN     "final_amount" INTEGER NOT NULL,
ADD COLUMN     "order_group_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "original_amount" INTEGER NOT NULL,
ADD COLUMN     "points_used" INTEGER NOT NULL;
