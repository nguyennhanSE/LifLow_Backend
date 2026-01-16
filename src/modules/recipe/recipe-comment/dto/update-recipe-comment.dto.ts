import { PartialType } from '@nestjs/swagger';
import { CreateRecipeCommentDto } from './create-recipe-comment.dto';

export class UpdateRecipeCommentDto extends PartialType(CreateRecipeCommentDto) {}

