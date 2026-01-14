import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Announcement, AnnouncementType } from '@prisma/client';

export class AnnouncementResponseDto {
  @ApiProperty({ description: 'Announcement ID (UUID)' })
  id!: string;

  @ApiProperty({ description: 'Announcement title' })
  title!: string;

  @ApiProperty({ description: 'Announcement type', enum: AnnouncementType })
  type!: AnnouncementType;

  @ApiProperty({ description: 'Whether the announcement is pinned/fixed at the top', example: false })
  isFixed!: boolean;

  @ApiPropertyOptional({ description: 'Announcement image URL' })
  imageUrl?: string | null;

  @ApiProperty({ description: 'Announcement content/body' })
  content!: string;

  @ApiPropertyOptional({ description: 'Author user ID' })
  authorId?: string | null;

  @ApiPropertyOptional({ description: 'Author name' })
  authorName?: string | null;

  @ApiProperty({ description: 'View count', example: 0 })
  views!: number;

  @ApiPropertyOptional({ description: 'Announcement status', example: 'active' })
  status?: string | null;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt!: Date;
}

export function toAnnouncementResponseDto(announcement: Announcement): AnnouncementResponseDto {
  return {
    id: announcement.id,
    title: announcement.title,
    type: announcement.type,
    isFixed: announcement.isFixed,
    imageUrl: announcement.imageUrl ?? null,
    content: announcement.content,
    authorId: announcement.authorId ?? null,
    authorName: announcement.authorName ?? null,
    views: announcement.views,
    status: announcement.status ?? 'active',
    createdAt: announcement.createdAt,
    updatedAt: announcement.updatedAt,
  };
}


