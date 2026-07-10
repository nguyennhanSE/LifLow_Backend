import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateRoomDto {}

export class JoinRoomDto {
  @IsString()
  @IsUUID()
  roomId!: string;
}

export class SendMessageDto {
  @IsString()
  @IsUUID()
  roomId!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}

// pagination
export class GetRoomsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['lastMessageAt', 'createdAt'])
  sortBy?: 'lastMessageAt' | 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
