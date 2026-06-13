-- AlterEnum
ALTER TYPE "CouponType" ADD VALUE 'FREE_SHIPPING';

-- AlterTable
ALTER TABLE "coupon_histories" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "can_auto_issue" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_been_issued" BOOLEAN NOT NULL DEFAULT false;
