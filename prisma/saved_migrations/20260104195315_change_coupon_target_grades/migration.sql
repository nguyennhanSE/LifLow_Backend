/*
  Warnings:

  - The `target_grades` column on the `coupons` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "coupons" DROP COLUMN "target_grades",
ADD COLUMN     "target_grades" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropEnum
DROP TYPE "CouponTargetGrade";
