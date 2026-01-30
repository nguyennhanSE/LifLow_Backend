/*
  Warnings:

  - You are about to drop the column `can_auto_issue` on the `coupons` table. All the data in the column will be lost.
  - You are about to drop the column `end_date` on the `coupons` table. All the data in the column will be lost.
  - You are about to drop the column `has_been_issued` on the `coupons` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `coupons` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "coupons_start_date_end_date_idx";

-- AlterTable
ALTER TABLE "coupons" DROP COLUMN "can_auto_issue",
DROP COLUMN "end_date",
DROP COLUMN "has_been_issued",
DROP COLUMN "start_date";
