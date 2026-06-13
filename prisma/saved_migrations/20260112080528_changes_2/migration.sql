-- AlterTable
ALTER TABLE "products" ADD COLUMN     "product_client_category" INTEGER[],
ALTER COLUMN "product_category_number" DROP NOT NULL;
