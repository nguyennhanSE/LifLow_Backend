/*
  Warnings:

  - You are about to drop the `product_category_banner_relations` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[product_id]` on the table `banners` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "product_category_banner_relations" DROP CONSTRAINT "product_category_banner_relations_banner_id_fkey";

-- DropForeignKey
ALTER TABLE "product_category_banner_relations" DROP CONSTRAINT "product_category_banner_relations_product_category_number_fkey";

-- DropForeignKey
ALTER TABLE "product_category_banner_relations" DROP CONSTRAINT "product_category_banner_relations_product_id_fkey";

-- DropTable
DROP TABLE "product_category_banner_relations";

-- CreateIndex
CREATE UNIQUE INDEX "banners_product_id_key" ON "banners"("product_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_product_category_number_fkey" FOREIGN KEY ("product_category_number") REFERENCES "categories"("product_category_number") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
