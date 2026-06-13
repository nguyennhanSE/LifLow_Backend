/*
  Warnings:

  - You are about to drop the column `status` on the `carts` table. All the data in the column will be lost.
  - You are about to drop the column `order_number` on the `points` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[order_group_number]` on the table `points` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CartItemStatus" AS ENUM ('ACTIVE', 'CHECKED_OUT');

-- DropForeignKey
ALTER TABLE "points" DROP CONSTRAINT "points_order_number_fkey";

-- DropIndex
DROP INDEX "carts_status_idx";

-- DropIndex
DROP INDEX "points_order_number_key";

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "status" "CartItemStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "carts" DROP COLUMN "status",
ADD COLUMN     "cart_item_status" "CartItemStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "points" DROP COLUMN "order_number",
ADD COLUMN     "order_group_number" VARCHAR(50);

-- DropEnum
DROP TYPE "CartStatus";

-- CreateIndex
CREATE UNIQUE INDEX "points_order_group_number_key" ON "points"("order_group_number");

-- AddForeignKey
ALTER TABLE "points" ADD CONSTRAINT "points_order_group_number_fkey" FOREIGN KEY ("order_group_number") REFERENCES "order_groups"("order_group_number") ON DELETE SET NULL ON UPDATE CASCADE;
