import { Module } from '@nestjs/common';
import { RecipeCommentController } from './recipe-comment.controller';
import { RecipeCommentService } from './recipe-comment.service';
import { RecipeCommentRepository } from './repositories/recipe-comment.repository';
import { PrismaModule } from 'prisma/prisma.module';
import { RecipeModule } from '../recipe.module';
import { LoggerModule } from 'src/libs/logger/logger.module';

@Module({
  imports: [PrismaModule, RecipeModule, LoggerModule],
  controllers: [RecipeCommentController],
  providers: [RecipeCommentService, RecipeCommentRepository],
  exports: [RecipeCommentService],
})
export class RecipeCommentModule {}

