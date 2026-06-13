/*
  Warnings:

  - Added the required column `address_name` to the `user_shipping_addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `delivery_address` to the `user_shipping_addresses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_shipping_addresses" ADD COLUMN     "address_name" TEXT NOT NULL,
ADD COLUMN     "delivery_address" TEXT NOT NULL;
