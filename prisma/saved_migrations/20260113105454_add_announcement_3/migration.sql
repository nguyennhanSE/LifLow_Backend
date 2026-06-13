-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "author_name" TEXT,
ALTER COLUMN "status" DROP NOT NULL;
