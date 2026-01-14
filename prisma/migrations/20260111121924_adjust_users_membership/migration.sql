-- AlterTable
ALTER TABLE "memberships" ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "min_price" DROP NOT NULL,
ALTER COLUMN "created_at" DROP NOT NULL;
