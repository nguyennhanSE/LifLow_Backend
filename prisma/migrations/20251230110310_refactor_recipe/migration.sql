/*
  Warnings:

  - The values [ALL] on the enum `CategoryType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `recipe_category_id` on the `recipes` table. All the data in the column will be lost.
  - You are about to drop the `recipe_categories` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `category` on the `recipes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "RecipeCategory" AS ENUM ('RECIPE', 'REVIEWS', 'DAILY_LIFE');

-- AlterEnum
BEGIN;
CREATE TYPE "CategoryType_new" AS ENUM ('LIVESTOCK', 'CONVENIENCE_FOOD', 'FISHERIES', 'SIDE_DISH');
ALTER TABLE "categories" ALTER COLUMN "name" TYPE "CategoryType_new" USING ("name"::text::"CategoryType_new");
ALTER TYPE "CategoryType" RENAME TO "CategoryType_old";
ALTER TYPE "CategoryType_new" RENAME TO "CategoryType";
DROP TYPE "public"."CategoryType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "recipes" DROP CONSTRAINT "recipes_recipe_category_id_fkey";

-- AlterTable
ALTER TABLE "recipes" DROP COLUMN "recipe_category_id",
DROP COLUMN "category",
ADD COLUMN     "category" "RecipeCategory" NOT NULL;

-- DropTable
DROP TABLE "recipe_categories";
