import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RemoveFcmTokenDto {
  @ApiProperty({ description: 'FCM token to remove' })
  @IsNotEmpty()
  @IsString()
  token!: string;
}
