/*
  Warnings:

  - You are about to drop the column `inquiry` on the `product_inquiries` table. All the data in the column will be lost.
  - Added the required column `content` to the `product_inquiries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `product_inquiries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "product_inquiries" DROP COLUMN "inquiry",
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;
