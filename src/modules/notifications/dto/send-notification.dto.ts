import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsIn, IsArray, IsObject } from 'class-validator';

export const NOTIFICATION_TYPES = ['ORDER_STATUS', 'DELIVERY', 'COUPON', 'PROMOTION', 'RECIPE', 'GENERAL'] as const;

export class SendNotificationDto {
  @ApiProperty({ description: 'User ID(s) to send notification to' })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  userIds!: string[];

  @ApiProperty({ description: 'Notification title' })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Notification body' })
  @IsNotEmpty()
  @IsString()
  body!: string;

  @ApiPropertyOptional({ description: 'Notification type', enum: NOTIFICATION_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(NOTIFICATION_TYPES)
  type?: string;

  @ApiPropertyOptional({ description: 'Custom payload for deep linking (e.g. orderGroupNumber, productId, deepLink)' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
