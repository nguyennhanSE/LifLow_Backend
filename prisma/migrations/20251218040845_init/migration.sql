-- CreateEnum
CREATE TYPE "OrderSituation" AS ENUM ('ORDER_NEW', 'ORDER_PAYMENT_PENDING', 'ORDER_PAYMENT_COMPLETED', 'ORDER_IN_PREPARE', 'ORDER_BEING_SHIPPED', 'ORDER_SHIPPED', 'ORDER_CANCELLED', 'ORDER_RETURNED');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENT', 'AMOUNT');

-- CreateEnum
CREATE TYPE "CouponTargetGrade" AS ENUM ('VIP', 'VVIP');

-- CreateEnum
CREATE TYPE "CouponHistoryStatus" AS ENUM ('ISSUED', 'USED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "membershipLevel" TEXT,
    "age" INTEGER,
    "email" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "total_used_points" INTEGER NOT NULL DEFAULT 0,
    "available_points" INTEGER NOT NULL DEFAULT 0,
    "registration_date" TEXT NOT NULL,
    "dormancy_date" TEXT,
    "withdrawal_date" TEXT,
    "withdrawal_type" TEXT,
    "reason_for_withdrawal" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "total_purchase_amount" INTEGER NOT NULL DEFAULT 0,
    "dashboard_access" BOOLEAN NOT NULL DEFAULT false,
    "member_access" BOOLEAN NOT NULL DEFAULT false,
    "product_access" BOOLEAN NOT NULL DEFAULT false,
    "order_access" BOOLEAN NOT NULL DEFAULT false,
    "recipe_access" BOOLEAN NOT NULL DEFAULT false,
    "banner_access" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "membership_name" TEXT NOT NULL,
    "membership_description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'normal',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "updated_by_admin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "min_price" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "ip" TEXT,
    "expiredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token_used" (
    "id" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "refresh_token_used_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL DEFAULT '',
    "item_wise_order_number" TEXT NOT NULL DEFAULT '',
    "total_order_amount" INTEGER NOT NULL,
    "total_payment_amount" INTEGER NOT NULL,
    "product_number" INTEGER NOT NULL,
    "product_name" TEXT NOT NULL DEFAULT '',
    "product_name_with_options" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL,
    "recipient" TEXT NOT NULL DEFAULT '',
    "recipient_address_full" TEXT NOT NULL DEFAULT '',
    "recipient_postal_code" INTEGER NOT NULL,
    "recipient_mobile_phone" TEXT NOT NULL DEFAULT '',
    "recipient_phone_number" TEXT NOT NULL DEFAULT '',
    "delivery_message" TEXT NOT NULL DEFAULT '',
    "sale_price" INTEGER NOT NULL,
    "payment_type" TEXT NOT NULL DEFAULT '',
    "payment_method" TEXT NOT NULL DEFAULT '',
    "order_date" TEXT NOT NULL DEFAULT '',
    "orderer_name" TEXT NOT NULL DEFAULT '',
    "orderer_mobile_phone" TEXT NOT NULL DEFAULT '',
    "orderer_id" TEXT,
    "desired_delivery_date" TEXT NOT NULL DEFAULT '',
    "membership_level_at_order_time" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "situation" "OrderSituation",
    "courier_company" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "product_code" TEXT,
    "own_product_code" TEXT,
    "display_status" TEXT,
    "sale_status" TEXT,
    "product_category_number" TEXT,
    "product_category_new_product_area" TEXT,
    "product_category_recommended_product_area" TEXT,
    "product_name" VARCHAR(128),
    "english_product_name" TEXT,
    "product_name_for_management" TEXT,
    "supplier_product_name" TEXT,
    "model_name" TEXT,
    "product_summary_description" TEXT,
    "product_brief_description" TEXT,
    "search_keyword_setting" TEXT,
    "tax_classification" TEXT,
    "consumer_price" INTEGER,
    "supply_price" INTEGER,
    "product_price" INTEGER,
    "sale_price" INTEGER,
    "use_sale_price_alternative_text" TEXT,
    "sale_price_alternative_text" TEXT,
    "order_quantity_limit_criteria" TEXT,
    "min_order_quantity" INTEGER,
    "max_order_quantity" INTEGER,
    "reward_points" INTEGER,
    "reward_points_classification" TEXT,
    "common_event_info" TEXT,
    "adult_verification" TEXT,
    "option_usage" TEXT,
    "item_composition_method" TEXT,
    "option_display_method" TEXT,
    "option_set_name" TEXT,
    "option_input" TEXT,
    "option_style" TEXT,
    "button_image_setting" TEXT,
    "color_setting" TEXT,
    "required_or_not" TEXT,
    "out_of_stock_display_text" TEXT,
    "additional_input_option" TEXT,
    "additional_input_option_name" TEXT,
    "additional_input_option_required_or_not" TEXT,
    "input_character_count" TEXT,
    "image_registration_detail" TEXT,
    "image_registration_list" TEXT,
    "image_registration_small_list" TEXT,
    "image_registration_thumbnail" TEXT,
    "manufacturer" TEXT,
    "supplier" TEXT,
    "brand" TEXT,
    "trend" TEXT,
    "own_classification_code" TEXT,
    "manufacturing_date" TEXT,
    "release_date" TEXT,
    "validity_period_usage" TEXT,
    "validity_period" TEXT,
    "origin" INTEGER,
    "product_volume" TEXT,
    "volume_weight" TEXT,
    "product_payment_guide" TEXT,
    "product_delivery_guide" TEXT,
    "exchange_return_guide" TEXT,
    "service_inquiry_guide" TEXT,
    "delivery_info" TEXT,
    "delivery_method" TEXT,
    "domestic_overseas_delivery" TEXT,
    "delivery_area" TEXT,
    "delivery_fee_prepayment_setting" TEXT,
    "delivery_period" TEXT,
    "delivery_fee_classification" TEXT,
    "delivery_fee_input" TEXT,
    "product_classification_customs" TEXT,
    "product_material" TEXT,
    "english_product_material_customs" TEXT,
    "fabric_customs" TEXT,
    "seo_search_engine_exposure_setting" TEXT,
    "seo_title" TEXT,
    "seo_author" TEXT,
    "seo_description" TEXT,
    "seo_keywords" TEXT,
    "seo_product_image_alt_text" TEXT,
    "individual_payment_method_setting" TEXT,
    "product_delivery_type_code" TEXT,
    "store_pickup_setting" TEXT,
    "product_total_weight" INTEGER,
    "hs_code" BIGINT,
    "additional_item_01_today_departure_delivery_usage" TEXT,
    "additional_item_02_today_departure_delivery_time" TEXT,
    "additional_item_03_storage_method" TEXT,
    "additional_item_04_origin" TEXT,
    "additional_item_05_event" TEXT,
    "additional_item_06_parcel_delivery" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points" (
    "id" TEXT NOT NULL,
    "date" VARCHAR(50),
    "user_id" VARCHAR(50),
    "membership_level" VARCHAR(50),
    "content" VARCHAR(50),
    "order_number" VARCHAR(50),
    "points_type" VARCHAR(50),
    "available_points_increase" INTEGER,
    "available_points_deduction" INTEGER,
    "available_points_balance" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "authorId" TEXT,
    "authorName" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "date_of_writing" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "thumbnail_url" TEXT,
    "content" TEXT NOT NULL,
    "ingredients" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_categories" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "type" "CouponType" NOT NULL,
    "discount_rate" INTEGER,
    "discount_amount" INTEGER,
    "min_purchase_amount" INTEGER NOT NULL DEFAULT 0,
    "max_discount_amount" INTEGER,
    "image_url" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_auto_issue" BOOLEAN NOT NULL DEFAULT false,
    "auto_issue_day_of_month" TIMESTAMP(3),
    "target_grades" "CouponTargetGrade"[] DEFAULT ARRAY[]::"CouponTargetGrade"[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_histories" (
    "id" TEXT NOT NULL,
    "coupon_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "status" "CouponHistoryStatus" NOT NULL DEFAULT 'ISSUED',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "discount_applied_amount" INTEGER,
    "purchase_amount_at_use" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupon_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_id_key" ON "users"("id");

-- CreateIndex
CREATE UNIQUE INDEX "user_memberships_id_key" ON "user_memberships"("id");

-- CreateIndex
CREATE INDEX "user_memberships_userId_membershipId_idx" ON "user_memberships"("userId", "membershipId");

-- CreateIndex
CREATE INDEX "user_memberships_membershipId_idx" ON "user_memberships"("membershipId");

-- CreateIndex
CREATE INDEX "user_memberships_userId_idx" ON "user_memberships"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_name_key" ON "memberships"("name");

-- CreateIndex
CREATE INDEX "memberships_name_idx" ON "memberships"("name");

-- CreateIndex
CREATE INDEX "memberships_min_price_idx" ON "memberships"("min_price");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");

-- CreateIndex
CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "sessions_userId_expiredAt_idx" ON "sessions"("userId", "expiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_used_refreshToken_key" ON "refresh_token_used"("refreshToken");

-- CreateIndex
CREATE INDEX "refresh_token_used_sessionId_idx" ON "refresh_token_used"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "points_user_id_key" ON "points"("user_id");

-- CreateIndex
CREATE INDEX "recipes_status_idx" ON "recipes"("status");

-- CreateIndex
CREATE INDEX "recipes_authorId_idx" ON "recipes"("authorId");

-- CreateIndex
CREATE INDEX "recipes_date_of_writing_idx" ON "recipes"("date_of_writing");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_categories_recipe_id_key" ON "recipe_categories"("recipe_id");

-- CreateIndex
CREATE INDEX "recipe_categories_recipe_id_idx" ON "recipe_categories"("recipe_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_code_idx" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_is_active_idx" ON "coupons"("is_active");

-- CreateIndex
CREATE INDEX "coupons_start_date_end_date_idx" ON "coupons"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "coupon_histories_coupon_id_idx" ON "coupon_histories"("coupon_id");

-- CreateIndex
CREATE INDEX "coupon_histories_user_id_idx" ON "coupon_histories"("user_id");

-- CreateIndex
CREATE INDEX "coupon_histories_order_id_idx" ON "coupon_histories"("order_id");

-- CreateIndex
CREATE INDEX "coupon_histories_status_idx" ON "coupon_histories"("status");

-- CreateIndex
CREATE INDEX "coupon_histories_issued_at_idx" ON "coupon_histories"("issued_at");

-- AddForeignKey
ALTER TABLE "user_memberships" ADD CONSTRAINT "user_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_memberships" ADD CONSTRAINT "user_memberships_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token_used" ADD CONSTRAINT "refresh_token_used_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_orderer_id_fkey" FOREIGN KEY ("orderer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points" ADD CONSTRAINT "points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_categories" ADD CONSTRAINT "recipe_categories_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_histories" ADD CONSTRAINT "coupon_histories_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_histories" ADD CONSTRAINT "coupon_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_histories" ADD CONSTRAINT "coupon_histories_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
