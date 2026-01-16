/*
  Warnings:

  - The values [ALL] on the enum `BannerType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BannerType_new" AS ENUM ('MAIN_PRODUCTS', 'CATEGORY', 'FOOTER', 'CONTENT_HERO', 'SPECIAL_PRICE');
ALTER TABLE "banners" ALTER COLUMN "type" TYPE "BannerType_new" USING ("type"::text::"BannerType_new");
ALTER TYPE "BannerType" RENAME TO "BannerType_old";
ALTER TYPE "BannerType_new" RENAME TO "BannerType";
DROP TYPE "public"."BannerType_old";
COMMIT;

-- AlterTable
ALTER TABLE "user_shipping_addresses" ALTER COLUMN "postal_code" DROP NOT NULL,
ALTER COLUMN "mobile_phone" DROP NOT NULL,
ALTER COLUMN "phone_number" DROP NOT NULL;
