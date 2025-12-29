import { Module, Logger } from '@nestjs/common';
import { RecipeService } from './recipe.service';
import { RecipeController } from './recipe.controller';
import { RecipeRepository } from './repositories/recipe.repository';
import { PrismaModule } from 'prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { LoggerModule } from 'src/libs/logger/logger.module';
import { AwsModule } from 'src/libs/integration/aws/aws.module';
import { RecipeUserInterceptor } from './interceptors/recipe.interceptor';

@Module({
  imports: [PrismaModule, UserModule, LoggerModule, AwsModule],
  controllers: [RecipeController],
  providers: [RecipeService, RecipeRepository, RecipeUserInterceptor],
  exports: [RecipeService],
})
export class RecipeModule {}
