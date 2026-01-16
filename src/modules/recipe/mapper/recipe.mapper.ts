import { Recipe, User, Product } from '@prisma/client';
import { RecipeEntity, RecipeEntityWithAuthor } from '../entities/recipe.entity';
import { toUserEntity } from 'src/modules/user/mapper/user.mapper';
import { toProductEntity } from 'src/modules/product/mapper/product.mapper';
import { ERecipeCategory } from '../enums/recipe.enum';

/**
 * Type for Recipe with author and product relations
 */
// export type RecipeWithAuthor = Recipe;
export type RecipeWithAuthor = Recipe & { author?: User | null; product?: Product | null }; 

/**
 * Maps Prisma Recipe to RecipeEntity
 */

export function toRecipeEntity(recipe: Recipe): RecipeEntity {
  return {
    id: recipe.id,
    title: recipe.title,
    authorId: recipe.authorId ?? null,
    authorName: recipe.authorName ?? null,
    category: recipe.category as ERecipeCategory,
    dateOfWriting: recipe.dateOfWriting,
    views: recipe.views,
    status: recipe.status,  
    thumbnailUrl: Array.isArray(recipe.thumbnailUrl) 
      ? (recipe.thumbnailUrl.length > 0 ? recipe.thumbnailUrl[0] : null)
      : (recipe.thumbnailUrl || null),
    content: recipe.content,
    ingredients: recipe.ingredients,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
    isActive: recipe.isActive,
  };
}

export function toRecipeEntityWithAuthor(recipe: RecipeWithAuthor): RecipeEntityWithAuthor{
  return {
    ...toRecipeEntity(recipe),
    author: recipe.author ? toUserEntity(recipe.author) : null,
    product: recipe.product ? toProductEntity(recipe.product) : null,
  };
}

/**
 * Maps Recipe to RecipeResponseDto
 * This is the main function to use for API responses
 */
// export function mapToResponse(recipe: RecipeWithAuthor): RecipeResponseDto {
//   const entity = toRecipeEntity(recipe);
//   return {
//     id: entity.id,
//     title: entity.title,
//     authorId: entity.authorId,
//     authorName: entity.authorName,
//     category: entity.category,
//     dateOfWriting: entity.dateOfWriting,
//     views: entity.views,
//     status: entity.status,
//     thumbnailUrl: entity.thumbnailUrl ?? null,
//     content: entity.content,
//     ingredients: entity.ingredients,
//     createdAt: entity.createdAt,
//     updatedAt: entity.updatedAt,  
//   };
// }

/**
 * Maps array of Recipes to array of RecipeResponseDto
 */
// export function mapToResponseList(
//   recipes: RecipeWithAuthor[],
// ): RecipeResponseDto[] {
//   return recipes.map((recipe) => mapToResponse(recipe));
// }

/**
 * Excludes sensitive data from recipe
 * Currently no sensitive data in Recipe, but this is here for future use
 */

// export function excludeSensitiveData(
//   recipe: RecipeResponseDto,
// ): RecipeResponseDto {
//   // Remove password from author if present
//   if (recipe.author) {
//     const { password, ...authorWithoutPassword } = recipe.author as any;
//     return {
//       ...recipe,
//       author: authorWithoutPassword,
//     };
//   }
//   return recipe;
// }

/**
 * Maps recipe for public display (ensures only Active recipes are shown)
 */
// export function mapToPublicResponse(
//   recipe: RecipeWithAuthor,
// ): RecipeResponseDto | null {
//   if (recipe.status !== 'Active') {
//     return null;
//   }
//   return excludeSensitiveData(mapToResponse(recipe));
// }

/**
 * Maps array of recipes for public display
 */
// export function mapToPublicResponseList(
//   recipes: RecipeWithAuthor[],
// ): RecipeResponseDto[] {
//   return recipes
//     .filter((recipe) => recipe.status === 'Active')
//     .map((recipe) => mapToResponse(recipe))
//     .map((recipe) => excludeSensitiveData(recipe));
// }

/**
 * Creates a recipe summary (minimal data for lists)
 */
export interface RecipeSummaryDto {
  id: string;
  title: string;
  authorName: string;
  category: string | null;
  views: number;
  thumbnailUrl: string | null;
  createdAt: Date;
}

export function mapToSummary(recipe: RecipeWithAuthor): RecipeSummaryDto {
  return {
    id: recipe.id,
    title: recipe.title,
    authorName: recipe.authorName,
    category: recipe.category,
    views: recipe.views,
    thumbnailUrl: Array.isArray(recipe.thumbnailUrl)
      ? (recipe.thumbnailUrl.length > 0 ? recipe.thumbnailUrl[0] : null)
      : (recipe.thumbnailUrl || null),
    createdAt: recipe.createdAt,
  };
}

export function mapToSummaryList(
  recipes: RecipeWithAuthor[],
): RecipeSummaryDto[] {
  return recipes.map((recipe) => mapToSummary(recipe));
}

