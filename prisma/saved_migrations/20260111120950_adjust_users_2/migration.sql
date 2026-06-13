-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "phone_number" DROP NOT NULL,
ALTER COLUMN "total_used_points" DROP NOT NULL,
ALTER COLUMN "available_points" DROP NOT NULL,
ALTER COLUMN "registration_date" DROP NOT NULL,
ALTER COLUMN "total_purchase_amount" DROP NOT NULL,
ALTER COLUMN "dashboard_access" DROP NOT NULL,
ALTER COLUMN "member_access" DROP NOT NULL,
ALTER COLUMN "product_access" DROP NOT NULL,
ALTER COLUMN "order_access" DROP NOT NULL,
ALTER COLUMN "recipe_access" DROP NOT NULL,
ALTER COLUMN "banner_access" DROP NOT NULL;
