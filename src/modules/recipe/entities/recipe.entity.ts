import { UserEntity } from "src/modules/user/entities/user.entity";

export class RecipeEntity {
  id!: string;
  title?: string;
  authorId?: string | null;
  authorName?: string | null; // denormalized for fast listing
  category?: string;
  dateOfWriting?: Date; // @map("date_of_writing")
  views?: number;
  status?: string; // e.g., Active | Hidden
  thumbnailUrl?: string | null; // @map("thumbnail_url")
  content?: string;
  ingredients?: string[]; // @map("ingredients")
  createdAt?: Date; // @map("created_at")
  updatedAt?: Date; // @map("updated_at")
  isActive!: boolean; // @map("is_active")
}

export class RecipeEntityWithAuthor extends RecipeEntity {
  author: UserEntity | null;
}