-- CreateEnum
CREATE TYPE "OrderSituation" AS ENUM ('ORDER_PAYMENT_PENDING', 'ORDER_PAYMENT_COMPLETED', 'ORDER_PAYMENT_FAILED', 'ORDER_BEING_SHIPPED', 'ORDER_SHIPPED', 'ORDER_CANCELLED', 'ORDER_RETURNED');

-- CreateEnum
CREATE TYPE "CartItemStatus" AS ENUM ('ACTIVE', 'CHECKED_OUT');

-- CreateEnum
CREATE TYPE "RecipeCategory" AS ENUM ('RECIPE', 'REVIEWS', 'DAILY_LIFE');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENT', 'AMOUNT', 'FREE_SHIPPING');

-- CreateEnum
CREATE TYPE "CouponHistoryStatus" AS ENUM ('ISSUED', 'USED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BannerType" AS ENUM ('MAIN_PRODUCTS', 'CATEGORY', 'FOOTER', 'CONTENT_HERO', 'SPECIAL_PRICE');

-- CreateEnum
CREATE TYPE "BannerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('LIVESTOCK', 'CONVENIENCE_FOOD', 'FISHERIES', 'SIDE_DISH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('NORMAL', 'BILLING', 'BRANDPAY');

-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('GENERAL', 'RECIPE', 'USER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER_STATUS', 'COUPON', 'PROMOTION', 'RECIPE', 'GENERAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT,
    "membership_level" TEXT,
    "age" INTEGER,
    "email" TEXT,
    "phone_number" TEXT,
    "total_used_points" INTEGER DEFAULT 0,
    "available_points" INTEGER DEFAULT 0,
    "registration_date" TEXT,
    "dormancy_date" TEXT,
    "withdrawal_date" TEXT,
    "withdrawal_type" TEXT,
    "reason_for_withdrawal" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "total_purchase_amount" INTEGER DEFAULT 0,
    "dashboard_access" BOOLEAN DEFAULT false,
    "member_access" BOOLEAN DEFAULT false,
    "product_access" BOOLEAN DEFAULT false,
    "order_access" BOOLEAN DEFAULT false,
    "recipe_access" BOOLEAN DEFAULT false,
    "banner_access" BOOLEAN DEFAULT false,
    "mobile_phone_number" TEXT,
    "nick_name" TEXT,
    "status_message" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_shipping_addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "delivery_address" TEXT NOT NULL,
    "address_name" TEXT NOT NULL,
    "address_full" TEXT,
    "postal_code" INTEGER,
    "mobile_phone" TEXT,
    "phone_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "set_as_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_shipping_addresses_pkey" PRIMARY KEY ("id")
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
    "name" TEXT,
    "nick_name" TEXT,
    "base_period" INTEGER,
    "description" TEXT,
    "min_price" INTEGER,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
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
    "cart_id" TEXT,
    "order_number" TEXT DEFAULT '',
    "order_group_number" TEXT,
    "total_order_amount" INTEGER,
    "total_payment_amount" INTEGER,
    "product_client_id" TEXT,
    "product_name" TEXT DEFAULT '',
    "product_name_with_options" TEXT DEFAULT '',
    "quantity" INTEGER,
    "recipient" TEXT DEFAULT '',
    "recipient_address_full" TEXT DEFAULT '',
    "recipient_postal_code" INTEGER,
    "recipient_mobile_phone" TEXT DEFAULT '',
    "recipient_phone_number" TEXT DEFAULT '',
    "delivery_message" TEXT DEFAULT '',
    "sale_price" INTEGER,
    "payment_type" TEXT DEFAULT '',
    "payment_method" TEXT DEFAULT '',
    "order_date" TEXT DEFAULT '',
    "orderer_name" TEXT DEFAULT '',
    "orderer_mobile_phone" TEXT DEFAULT '',
    "orderer_id" TEXT,
    "desired_delivery_date" TEXT DEFAULT '',
    "membership_level_at_order_time" TEXT DEFAULT '',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "product_id" TEXT,
    "coupon_used" TEXT[],
    "discount_amount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_groups" (
    "order_group_number" TEXT NOT NULL DEFAULT '',
    "order_group_name" TEXT NOT NULL DEFAULT '',
    "original_amount" INTEGER NOT NULL,
    "discount_amount" INTEGER NOT NULL,
    "orderer_id" TEXT,
    "situation" "OrderSituation" NOT NULL DEFAULT 'ORDER_PAYMENT_PENDING',
    "final_amount" INTEGER NOT NULL,
    "points_used" INTEGER NOT NULL,
    "cart_item_ids" TEXT[],
    "delivery_fee" INTEGER NOT NULL DEFAULT 0,
    "payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "courier_company" TEXT,
    "invoice_number" TEXT
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "checked_out_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sale_price" INTEGER NOT NULL,
    "status" "CartItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points" (
    "id" TEXT NOT NULL,
    "date" VARCHAR(50),
    "user_id" VARCHAR(50),
    "membership_level" VARCHAR(50),
    "content" VARCHAR(500),
    "order_group_number" VARCHAR(50),
    "points_type" VARCHAR(50),
    "available_points_increase" INTEGER,
    "available_points_deduction" INTEGER,
    "available_points_balance" INTEGER,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "product_code" TEXT,
    "own_product_code" TEXT,
    "display_status" TEXT DEFAULT 'Y',
    "sale_status" TEXT,
    "product_client_category" INTEGER[],
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
    "product_total_weight" DOUBLE PRECISION,
    "hs_code" BIGINT,
    "additional_item_01_today_departure_delivery_usage" TEXT,
    "additional_item_02_today_departure_delivery_time" TEXT,
    "additional_item_03_storage_method" TEXT,
    "additional_item_04_origin" TEXT,
    "additional_item_05_event" TEXT,
    "additional_item_06_parcel_delivery" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "stock_quantity" INTEGER,
    "storage_method" TEXT,
    "additional_images" TEXT[],
    "product_category_number" INTEGER,
    "cta_button_url" VARCHAR(500),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_badges" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "is_hot_deal" BOOLEAN NOT NULL DEFAULT false,
    "is_new_product" BOOLEAN NOT NULL DEFAULT false,
    "is_best_seller" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "review" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "likes" INTEGER,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_review_likes" (
    "user_id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_review_likes_pkey" PRIMARY KEY ("user_id","review_id")
);

-- CreateTable
CREATE TABLE "recipe_likes" (
    "user_id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_likes_pkey" PRIMARY KEY ("user_id","recipe_id")
);

-- CreateTable
CREATE TABLE "product_discounts" (
    "id" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT false,
    "product_id" TEXT NOT NULL,
    "discount_rate" INTEGER NOT NULL,
    "discount_start_date" TIMESTAMP(3),
    "discount_end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_special_offers" (
    "id" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT false,
    "is_out_dated" BOOLEAN NOT NULL DEFAULT false,
    "product_id" TEXT NOT NULL,
    "discount_amount" INTEGER NOT NULL,
    "special_price_applied" INTEGER,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "product_special_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_inquiries" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "status" TEXT DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_inquiry_answers" (
    "id" TEXT NOT NULL,
    "inquiry_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_inquiry_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "product_category_number" SERIAL NOT NULL,
    "name" "CategoryType" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("product_category_number")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "authorId" TEXT,
    "productId" TEXT,
    "authorName" VARCHAR(100) NOT NULL,
    "category" "RecipeCategory" NOT NULL,
    "date_of_writing" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "thumbnail_url" TEXT[],
    "content" TEXT NOT NULL,
    "ingredients" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "likes" INTEGER DEFAULT 0,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_comments" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_comments_pkey" PRIMARY KEY ("id")
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
    "is_permanent" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_auto_issue" BOOLEAN NOT NULL DEFAULT false,
    "auto_issue_day_of_month" TIMESTAMP(3),
    "target_grades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_histories" (
    "id" TEXT NOT NULL,
    "coupon_id" TEXT,
    "user_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "order_id" TEXT,
    "status" "CouponHistoryStatus" NOT NULL DEFAULT 'ISSUED',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "payment_id" TEXT,
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

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "product_id" TEXT,
    "category" TEXT,
    "type" "BannerType" NOT NULL,
    "status" "BannerStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" VARCHAR(255),
    "badge_text" VARCHAR(100),
    "main_text" TEXT,
    "cta_button_text" VARCHAR(100),
    "cta_button_url" VARCHAR(500),
    "image_url" TEXT NOT NULL,
    "mobile_image_url" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_group_number" TEXT NOT NULL,
    "payment_key" TEXT NOT NULL,
    "transaction_key" TEXT,
    "m_id" TEXT,
    "total_amount" INTEGER NOT NULL,
    "balance_amount" INTEGER NOT NULL,
    "supplied_amount" INTEGER,
    "vat" INTEGER,
    "tax_free_amount" INTEGER NOT NULL DEFAULT 0,
    "tax_exemption_amount" INTEGER NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "type" "PaymentType" NOT NULL DEFAULT 'NORMAL',
    "method" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "order_name" TEXT NOT NULL,
    "delivery_fee" INTEGER NOT NULL DEFAULT 0,
    "requested_at" TIMESTAMP(3) NOT NULL,
    "approved_at" TIMESTAMP(3),
    "failure_code" TEXT,
    "failure_message" TEXT,
    "receipt_url" TEXT,
    "card_info" JSONB,
    "virtual_account_info" JSONB,
    "easy_pay_info" JSONB,
    "transfer_info" JSONB,
    "mobile_phone_info" JSONB,
    "gift_certificate_info" JSONB,
    "cancels" JSONB,
    "canceled_amount" INTEGER NOT NULL DEFAULT 0,
    "secret" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "payment_information" TEXT NOT NULL,
    "delivery_information" TEXT NOT NULL,
    "exchange_information" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL,
    "author_name" TEXT,
    "is_fixed" BOOLEAN NOT NULL DEFAULT false,
    "image_url" TEXT,
    "content" TEXT NOT NULL,
    "author_id" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fcm_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "device_id" TEXT,
    "platform" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fcm_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_id_key" ON "users"("id");

-- CreateIndex
CREATE UNIQUE INDEX "user_shipping_addresses_id_key" ON "user_shipping_addresses"("id");

-- CreateIndex
CREATE INDEX "user_shipping_addresses_userId_idx" ON "user_shipping_addresses"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_memberships_id_key" ON "user_memberships"("id");

-- CreateIndex
CREATE UNIQUE INDEX "user_memberships_userId_key" ON "user_memberships"("userId");

-- CreateIndex
CREATE INDEX "user_memberships_membershipId_idx" ON "user_memberships"("membershipId");

-- CreateIndex
CREATE INDEX "user_memberships_userId_idx" ON "user_memberships"("userId");

-- CreateIndex
CREATE INDEX "user_memberships_userId_membershipId_idx" ON "user_memberships"("userId", "membershipId");

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
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_order_number_idx" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_cart_id_idx" ON "orders"("cart_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_groups_order_group_number_key" ON "order_groups"("order_group_number");

-- CreateIndex
CREATE INDEX "order_groups_order_group_number_idx" ON "order_groups"("order_group_number");

-- CreateIndex
CREATE UNIQUE INDEX "carts_user_id_key" ON "carts"("user_id");

-- CreateIndex
CREATE INDEX "carts_user_id_idx" ON "carts"("user_id");

-- CreateIndex
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items"("cart_id");

-- CreateIndex
CREATE INDEX "cart_items_product_id_idx" ON "cart_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_product_id_key" ON "cart_items"("cart_id", "product_id");

-- CreateIndex
CREATE INDEX "product_review_likes_review_id_idx" ON "product_review_likes"("review_id");

-- CreateIndex
CREATE INDEX "product_review_likes_user_id_idx" ON "product_review_likes"("user_id");

-- CreateIndex
CREATE INDEX "recipe_likes_recipe_id_idx" ON "recipe_likes"("recipe_id");

-- CreateIndex
CREATE INDEX "recipe_likes_user_id_idx" ON "recipe_likes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_discounts_product_id_key" ON "product_discounts"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_special_offers_product_id_key" ON "product_special_offers"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_product_category_number_key" ON "categories"("product_category_number");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "recipes_status_idx" ON "recipes"("status");

-- CreateIndex
CREATE INDEX "recipes_authorId_idx" ON "recipes"("authorId");

-- CreateIndex
CREATE INDEX "recipes_date_of_writing_idx" ON "recipes"("date_of_writing");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_code_idx" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_is_active_idx" ON "coupons"("is_active");

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

-- CreateIndex
CREATE INDEX "banners_type_idx" ON "banners"("type");

-- CreateIndex
CREATE INDEX "banners_status_idx" ON "banners"("status");

-- CreateIndex
CREATE INDEX "banners_display_order_idx" ON "banners"("display_order");

-- CreateIndex
CREATE INDEX "banners_start_date_end_date_idx" ON "banners"("start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_group_number_key" ON "payments"("order_group_number");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_key_key" ON "payments"("payment_key");

-- CreateIndex
CREATE INDEX "payments_order_group_number_idx" ON "payments"("order_group_number");

-- CreateIndex
CREATE INDEX "payments_payment_key_idx" ON "payments"("payment_key");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_requested_at_idx" ON "payments"("requested_at");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "announcements_author_id_idx" ON "announcements"("author_id");

-- CreateIndex
CREATE INDEX "announcements_status_idx" ON "announcements"("status");

-- CreateIndex
CREATE INDEX "announcements_type_idx" ON "announcements"("type");

-- CreateIndex
CREATE UNIQUE INDEX "fcm_tokens_token_key" ON "fcm_tokens"("token");

-- CreateIndex
CREATE INDEX "fcm_tokens_user_id_idx" ON "fcm_tokens"("user_id");

-- CreateIndex
CREATE INDEX "fcm_tokens_token_idx" ON "fcm_tokens"("token");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "user_shipping_addresses" ADD CONSTRAINT "user_shipping_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_order_group_number_fkey" FOREIGN KEY ("order_group_number") REFERENCES "order_groups"("order_group_number") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_groups" ADD CONSTRAINT "order_groups_orderer_id_fkey" FOREIGN KEY ("orderer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points" ADD CONSTRAINT "points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points" ADD CONSTRAINT "points_order_group_number_fkey" FOREIGN KEY ("order_group_number") REFERENCES "order_groups"("order_group_number") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_badges" ADD CONSTRAINT "product_badges_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_review_likes" ADD CONSTRAINT "product_review_likes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "product_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_review_likes" ADD CONSTRAINT "product_review_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_likes" ADD CONSTRAINT "recipe_likes_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_likes" ADD CONSTRAINT "recipe_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_discounts" ADD CONSTRAINT "product_discounts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_special_offers" ADD CONSTRAINT "product_special_offers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_inquiries" ADD CONSTRAINT "product_inquiries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_inquiries" ADD CONSTRAINT "product_inquiries_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_inquiry_answers" ADD CONSTRAINT "product_inquiry_answers_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "product_inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_inquiry_answers" ADD CONSTRAINT "product_inquiry_answers_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_comments" ADD CONSTRAINT "recipe_comments_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_comments" ADD CONSTRAINT "recipe_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_histories" ADD CONSTRAINT "coupon_histories_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_histories" ADD CONSTRAINT "coupon_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_histories" ADD CONSTRAINT "coupon_histories_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_group_number_fkey" FOREIGN KEY ("order_group_number") REFERENCES "order_groups"("order_group_number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fcm_tokens" ADD CONSTRAINT "fcm_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
