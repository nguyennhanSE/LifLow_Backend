-- Ensure RecipeCategory.name is NOT unique (user requirement).
-- This is safe to run even if the index doesn't exist.

-- DropIndex
DROP INDEX IF EXISTS "recipe_categories_name_key";


