import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnnouncementType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAnnouncementDto {
  @ApiProperty({
    description: 'Announcement title',
    example: 'New feature update',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Announcement type',
    enum: AnnouncementType,
    example: AnnouncementType.GENERAL,
  })
  @IsEnum(AnnouncementType)
  type!: AnnouncementType;

  @ApiPropertyOptional({
    description: 'Whether the announcement is pinned/fixed at the top',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isFixed?: boolean;

  @ApiPropertyOptional({
    description: 'Optional announcement image URL',
    example: 'https://example.com/announcement.png',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({
    description: 'Announcement content/body',
    example: 'We have released a new feature...',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({
    description: 'Author user ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional({
    description: 'Author name (optional, auto-filled from user if not provided)',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  authorName?: string;

  @ApiPropertyOptional({
    description: 'Announcement status (defaults to "active")',
    example: 'active',
    default: 'active',
  })
  @IsOptional()
  @IsString()
  status?: string;
}
