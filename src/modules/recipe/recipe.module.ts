import { Module, Logger } from '@nestjs/common';
import { RecipeService } from './recipe.service';
import { RecipeController } from './recipe.controller';
import { RecipeRepository } from './repositories/recipe.repository';
import { PrismaModule } from 'prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { LoggerModule } from 'src/libs/logger/logger.module';

@Module({
  imports: [PrismaModule, UserModule, LoggerModule],
  controllers: [RecipeController],
  providers: [RecipeService, RecipeRepository],
  exports: [RecipeService],
})
export class RecipeModule {}
