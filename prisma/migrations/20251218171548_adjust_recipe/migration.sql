-- DropForeignKey
ALTER TABLE "recipe_categories" DROP CONSTRAINT "recipe_categories_recipe_id_fkey";

-- DropIndex
DROP INDEX "recipe_categories_recipe_id_idx";

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "recipe_category_id" TEXT;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_recipe_category_id_fkey" FOREIGN KEY ("recipe_category_id") REFERENCES "recipe_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
