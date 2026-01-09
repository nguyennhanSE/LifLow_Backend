-- AlterTable
ALTER TABLE "order_groups" ADD COLUMN     "delivery_fee" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "delivery_fee" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "user_shipping_addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address_full" TEXT NOT NULL,
    "postal_code" INTEGER NOT NULL,
    "mobile_phone" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "user_shipping_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_shipping_addresses_id_key" ON "user_shipping_addresses"("id");

-- CreateIndex
CREATE UNIQUE INDEX "user_shipping_addresses_userId_key" ON "user_shipping_addresses"("userId");

-- CreateIndex
CREATE INDEX "user_shipping_addresses_userId_idx" ON "user_shipping_addresses"("userId");

-- AddForeignKey
ALTER TABLE "user_shipping_addresses" ADD CONSTRAINT "user_shipping_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
