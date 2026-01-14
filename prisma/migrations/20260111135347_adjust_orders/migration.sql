-- DropIndex
DROP INDEX "points_order_group_number_key";

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "order_number" DROP NOT NULL,
ALTER COLUMN "total_order_amount" DROP NOT NULL,
ALTER COLUMN "total_payment_amount" DROP NOT NULL,
ALTER COLUMN "product_id" DROP NOT NULL,
ALTER COLUMN "product_name" DROP NOT NULL,
ALTER COLUMN "product_name_with_options" DROP NOT NULL,
ALTER COLUMN "quantity" DROP NOT NULL,
ALTER COLUMN "recipient" DROP NOT NULL,
ALTER COLUMN "recipient_address_full" DROP NOT NULL,
ALTER COLUMN "recipient_postal_code" DROP NOT NULL,
ALTER COLUMN "recipient_mobile_phone" DROP NOT NULL,
ALTER COLUMN "recipient_phone_number" DROP NOT NULL,
ALTER COLUMN "delivery_message" DROP NOT NULL,
ALTER COLUMN "sale_price" DROP NOT NULL,
ALTER COLUMN "payment_type" DROP NOT NULL,
ALTER COLUMN "payment_method" DROP NOT NULL,
ALTER COLUMN "order_date" DROP NOT NULL,
ALTER COLUMN "orderer_name" DROP NOT NULL,
ALTER COLUMN "orderer_mobile_phone" DROP NOT NULL,
ALTER COLUMN "desired_delivery_date" DROP NOT NULL,
ALTER COLUMN "membership_level_at_order_time" DROP NOT NULL,
ALTER COLUMN "created_at" DROP NOT NULL,
ALTER COLUMN "updated_at" DROP NOT NULL,
ALTER COLUMN "cart_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "points" ALTER COLUMN "created_at" DROP NOT NULL,
ALTER COLUMN "updated_at" DROP NOT NULL;
