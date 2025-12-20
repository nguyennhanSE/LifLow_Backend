-- CreateEnum
CREATE TYPE "BannerType" AS ENUM ('MAIN_PRODUCTS', 'CATEGORY', 'FOOTER', 'CONTENT_HERO', 'SPECIAL_PRICE');

-- CreateEnum
CREATE TYPE "BannerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SCHEDULED');

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "type" "BannerType" NOT NULL,
    "status" "BannerStatus" NOT NULL DEFAULT 'ACTIVE',
    "product_id" TEXT,
    "title" VARCHAR(255),
    "badge_text" VARCHAR(100),
    "main_text" TEXT,
    "cta_button_text" VARCHAR(100),
    "cta_button_url" VARCHAR(500),
    "image_url" TEXT NOT NULL,
    "mobile_image_url" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "product_name" VARCHAR(255),
    "product_price" INTEGER,
    "product_brand" VARCHAR(255),
    "product_explanation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "banners_product_id_key" ON "banners"("product_id");

-- CreateIndex
CREATE INDEX "banners_type_idx" ON "banners"("type");

-- CreateIndex
CREATE INDEX "banners_status_idx" ON "banners"("status");

-- CreateIndex
CREATE INDEX "banners_display_order_idx" ON "banners"("display_order");

-- CreateIndex
CREATE INDEX "banners_start_date_end_date_idx" ON "banners"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "banners_product_id_idx" ON "banners"("product_id");

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
