/*
  Warnings:

  - You are about to drop the column `recipe_id` on the `recipe_categories` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "recipe_categories_recipe_id_key";

-- AlterTable
ALTER TABLE "recipe_categories" DROP COLUMN "recipe_id",
ADD COLUMN     "description" TEXT;
