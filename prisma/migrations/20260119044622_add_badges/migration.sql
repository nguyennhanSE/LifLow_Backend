-- CreateTable
CREATE TABLE "product_badges" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "is_hot_deal" BOOLEAN NOT NULL DEFAULT false,
    "is_new_product" BOOLEAN NOT NULL DEFAULT false,
    "is_best_seller" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_badges_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "product_badges" ADD CONSTRAINT "product_badges_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
