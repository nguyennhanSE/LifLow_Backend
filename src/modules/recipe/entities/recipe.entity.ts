import { UserEntity } from "src/modules/user/entities/user.entity";
import { ProductEntity } from "src/modules/product/entities/product.entity";
import { ERecipeCategory } from "../enums/recipe.enum";

export class RecipeEntity {
  id!: string;
  title?: string;
  authorId?: string | null;
  authorName?: string | null; // denormalized for fast listing
  category?: ERecipeCategory;
  dateOfWriting?: Date; // @map("date_of_writing")
  views?: number;
  status?: string; // e.g., Active | Hidden
  thumbnailUrl?: string[]; // @map("thumbnail_url")
  content?: string;
  ingredients?: string[]; // @map("ingredients")
  createdAt?: Date; // @map("created_at")
  updatedAt?: Date; // @map("updated_at")
  isActive!: boolean; // @map("is_active")
  likes?: number | null; // @map("likes") - like count
  likedByMe?: boolean; // whether the current user has liked this recipe
  numberOfLikes?: number; // count from RecipeLikes table
  numberOfComments?: number; // count from RecipeComments table
}

export class RecipeEntityWithAuthor extends RecipeEntity {
  author: UserEntity | null;
  product?: ProductEntity | null;
}