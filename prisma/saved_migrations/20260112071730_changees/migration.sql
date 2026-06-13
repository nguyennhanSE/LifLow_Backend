/*
  Warnings:

  - You are about to drop the column `product_category_number` on the `banners` table. All the data in the column will be lost.
  - The primary key for the `categories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `product_category_number` column on the `categories` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `product_category_number` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_product_category_number_fkey";

-- AlterTable
ALTER TABLE "banners" DROP COLUMN "product_category_number",
ADD COLUMN     "category" TEXT;

-- AlterTable
ALTER TABLE "categories" DROP CONSTRAINT "categories_pkey",
DROP COLUMN "product_category_number",
ADD COLUMN     "product_category_number" SERIAL NOT NULL,
ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("product_category_number");

-- AlterTable
ALTER TABLE "product_inquiries" ADD COLUMN     "status" TEXT DEFAULT 'PENDING',
ALTER COLUMN "content" DROP NOT NULL,
ALTER COLUMN "title" DROP NOT NULL;

-- AlterTable
ALTER TABLE "product_reviews" ALTER COLUMN "created_at" DROP NOT NULL,
ALTER COLUMN "updated_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "product_category_number",
ADD COLUMN     "product_category_number" INTEGER NOT NULL,
ALTER COLUMN "product_total_weight" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "created_at" DROP NOT NULL,
ALTER COLUMN "updated_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_url" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "categories_product_category_number_key" ON "categories"("product_category_number");
