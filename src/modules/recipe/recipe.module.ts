import { Module, Logger } from '@nestjs/common';
import { RecipeService } from './recipe.service';
import { RecipeController } from './recipe.controller';
import { RecipeRepository } from './repositories/recipe.repository';
import { PrismaModule } from 'prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { LoggerModule } from 'src/libs/logger/logger.module';
import { AwsModule } from 'src/libs/integration/aws/aws.module';
import { RecipeUserInterceptor } from './interceptors/recipe.interceptor';
import { NotificationsModule } from '../notifications/notifications.module';
import { SseModule } from 'src/libs/sse/sse.module';

@Module({
  imports: [PrismaModule, UserModule, LoggerModule, AwsModule, NotificationsModule, SseModule],
  controllers: [RecipeController],
  providers: [RecipeService, RecipeRepository, RecipeUserInterceptor],
  exports: [RecipeService, RecipeRepository],
})
export class RecipeModule {}
