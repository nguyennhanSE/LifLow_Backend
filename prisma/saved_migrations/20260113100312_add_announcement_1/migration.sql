/*
  Warnings:

  - The values [GENERAl] on the enum `AnnouncementType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AnnouncementType_new" AS ENUM ('GENERAL', 'RECIPE', 'USER');
ALTER TABLE "announcements" ALTER COLUMN "type" TYPE "AnnouncementType_new" USING ("type"::text::"AnnouncementType_new");
ALTER TYPE "AnnouncementType" RENAME TO "AnnouncementType_old";
ALTER TYPE "AnnouncementType_new" RENAME TO "AnnouncementType";
DROP TYPE "public"."AnnouncementType_old";
COMMIT;
