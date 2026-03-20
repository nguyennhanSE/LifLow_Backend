import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsIn, MaxLength } from 'class-validator';

export class SaveFcmTokenDto {
  @ApiProperty({ description: 'FCM registration token from the client' })
  @IsNotEmpty()
  @IsString()
  token!: string;

  @ApiPropertyOptional({ description: 'Device identifier (e.g. device UUID)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Platform: android | ios | web', enum: ['android', 'ios', 'web'] })
  @IsOptional()
  @IsString()
  @IsIn(['android', 'ios', 'web'])
  platform?: string;
}
