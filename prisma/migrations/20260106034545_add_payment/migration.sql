/*
  Warnings:

  - You are about to drop the column `amount` on the `payments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[order_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[payment_key]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `balance_amount` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order_id` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order_name` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_key` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requested_at` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_amount` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('NORMAL', 'BILLING', 'BRANDPAY');

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "amount",
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "balance_amount" INTEGER NOT NULL,
ADD COLUMN     "canceled_amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cancels" JSONB,
ADD COLUMN     "card_info" JSONB,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'KRW',
ADD COLUMN     "easy_pay_info" JSONB,
ADD COLUMN     "failure_code" TEXT,
ADD COLUMN     "failure_message" TEXT,
ADD COLUMN     "gift_certificate_info" JSONB,
ADD COLUMN     "m_id" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "method" TEXT,
ADD COLUMN     "mobile_phone_info" JSONB,
ADD COLUMN     "order_id" TEXT NOT NULL,
ADD COLUMN     "order_name" TEXT NOT NULL,
ADD COLUMN     "payment_key" TEXT NOT NULL,
ADD COLUMN     "receipt_url" TEXT,
ADD COLUMN     "requested_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "secret" TEXT,
ADD COLUMN     "subscription_id" TEXT,
ADD COLUMN     "supplied_amount" INTEGER,
ADD COLUMN     "tax_exemption_amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tax_free_amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_amount" INTEGER NOT NULL,
ADD COLUMN     "transaction_key" TEXT,
ADD COLUMN     "transfer_info" JSONB,
ADD COLUMN     "type" "PaymentType" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "vat" INTEGER,
ADD COLUMN     "virtual_account_info" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_key_key" ON "payments"("payment_key");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_payment_key_idx" ON "payments"("payment_key");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_requested_at_idx" ON "payments"("requested_at");
