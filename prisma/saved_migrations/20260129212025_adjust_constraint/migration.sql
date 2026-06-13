-- DropForeignKey
ALTER TABLE "coupon_histories" DROP CONSTRAINT "coupon_histories_coupon_id_fkey";

-- AlterTable
ALTER TABLE "coupon_histories" ALTER COLUMN "coupon_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "coupon_histories" ADD CONSTRAINT "coupon_histories_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
