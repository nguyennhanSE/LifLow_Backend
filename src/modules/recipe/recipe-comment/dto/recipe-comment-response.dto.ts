import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class AuthorInfoDto {
  @ApiProperty({ description: 'Author ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiPropertyOptional({ description: 'Author name', example: 'John Doe' })
  @Expose()
  name?: string | null;

  @ApiPropertyOptional({ description: 'Author email', example: 'john.doe@example.com' })
  @Expose()
  email?: string | null;
}

export class RecipeInfoDto {
  @ApiProperty({ description: 'Recipe ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiPropertyOptional({ description: 'Recipe title', example: 'Delicious Homemade Pasta' })
  @Expose()
  title?: string | null;
}

export class RecipeCommentResponseDto {
  @ApiProperty({ description: 'Comment ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Recipe ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  recipeId!: string;

  @ApiProperty({ description: 'Author ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  authorId!: string;

  @ApiProperty({ description: 'Comment content', example: 'This recipe looks amazing! I will definitely try it.' })
  @Expose()
  content!: string;

  @ApiProperty({ description: 'Comment creation timestamp', example: '2025-01-15T10:30:00.000Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ description: 'Comment last update timestamp', example: '2025-01-15T10:30:00.000Z' })
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Author information',
    type: AuthorInfoDto,
  })
  @Expose()
  @Type(() => AuthorInfoDto)
  author?: AuthorInfoDto;

  @ApiPropertyOptional({
    description: 'Recipe information',
    type: RecipeInfoDto,
  })
  @Expose()
  @Type(() => RecipeInfoDto)
  recipe?: RecipeInfoDto;
}

