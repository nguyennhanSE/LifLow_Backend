-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "likes" INTEGER DEFAULT 0;

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

-- CreateIndex
CREATE INDEX "product_review_likes_review_id_idx" ON "product_review_likes"("review_id");

-- CreateIndex
CREATE INDEX "product_review_likes_user_id_idx" ON "product_review_likes"("user_id");

-- CreateIndex
CREATE INDEX "recipe_likes_recipe_id_idx" ON "recipe_likes"("recipe_id");

-- CreateIndex
CREATE INDEX "recipe_likes_user_id_idx" ON "recipe_likes"("user_id");

-- AddForeignKey
ALTER TABLE "product_review_likes" ADD CONSTRAINT "product_review_likes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "product_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_review_likes" ADD CONSTRAINT "product_review_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_likes" ADD CONSTRAINT "recipe_likes_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_likes" ADD CONSTRAINT "recipe_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
