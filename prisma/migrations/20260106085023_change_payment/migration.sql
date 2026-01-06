/*
  Warnings:

  - You are about to drop the column `order_id` on the `payments` table. All the data in the column will be lost.
  - Added the required column `order_group_number` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "payments_order_id_idx";

-- DropIndex
DROP INDEX "payments_order_id_key";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "order_id",
ADD COLUMN     "order_group_number" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "payments_order_group_number_idx" ON "payments"("order_group_number");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_group_number_fkey" FOREIGN KEY ("order_group_number") REFERENCES "order_groups"("order_group_number") ON DELETE CASCADE ON UPDATE CASCADE;
