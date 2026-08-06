/*
  Warnings:

  - Changed the type of `event_type` on the `user_event_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserEventType" AS ENUM ('auth_event', 'product_event', 'cart_event', 'order_event', 'payment_event', 'coupon_event', 'membership_event', 'recipe_event', 'user_event', 'system_event');

-- AlterTable
ALTER TABLE "user_event_logs" DROP COLUMN "event_type",
ADD COLUMN     "event_type" "UserEventType" NOT NULL;

-- CreateIndex
CREATE INDEX "user_event_logs_event_id_event_type_idx" ON "user_event_logs"("event_id", "event_type");

-- CreateIndex
CREATE INDEX "user_event_logs_event_id_event_type_loki_pushed_at_idx" ON "user_event_logs"("event_id", "event_type", "loki_pushed_at");
