/*
  Warnings:

  - You are about to drop the column `name` on the `user_shipping_addresses` table. All the data in the column will be lost.
  - Added the required column `recipient_name` to the `user_shipping_addresses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_shipping_addresses" DROP COLUMN "name",
ADD COLUMN     "recipient_name" TEXT NOT NULL;
