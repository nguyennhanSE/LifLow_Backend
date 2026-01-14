import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AnnouncementType } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateAnnouncementDto {
    @ApiPropertyOptional({
        description: 'Announcement title',
        example: 'New feature update',
    })
    @IsString()
    @IsNotEmpty()
    title?: string;     

    @ApiPropertyOptional({
        description: 'Announcement type',
        enum: AnnouncementType,
        example: AnnouncementType.GENERAL,
    })
    @IsEnum(AnnouncementType)
    type?: AnnouncementType;

    @ApiPropertyOptional({
        description: 'Whether the announcement is pinned/fixed at the top',
        example: false,
        default: false,
    })
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    })
    @IsOptional()
    @IsBoolean()
    isFixed?: boolean;

    @ApiPropertyOptional({
        description: 'Announcement image URL',
        example: 'https://example.com/announcement.png',
    })
    @IsOptional() 
    @IsString()
    imageUrl?: string;

    @ApiPropertyOptional({
        description: 'Announcement content',
        example: 'We have released a new feature...',
    })
    @IsOptional()
    @IsString()
    content?: string;

    @ApiPropertyOptional({
        description: 'Author name',
        example: 'John Doe',
    })
    @IsOptional() 
    @IsString()
    authorName?: string;

    @ApiPropertyOptional({
        description: 'Announcement status',
        example: 'active',
        default: 'active',
    })
    @IsOptional()
    @IsString()
    status?: string;
}
