-- AlterTable
ALTER TABLE "products" ADD COLUMN     "additional_images" TEXT[],
ADD COLUMN     "stock_quantity" INTEGER,
ADD COLUMN     "storage_method" TEXT;
