/*
  Warnings:

  - You are about to drop the column `subscription_id` on the `payments` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "points_user_id_key";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "subscription_id";
