-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "is_permanent" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "start_date" DROP NOT NULL,
ALTER COLUMN "end_date" DROP NOT NULL;
