import { Announcement, Prisma } from '@prisma/client';
import { AnnouncementEntity } from '../entities/announcement.entity';
import { EAnnouncementType, EAnnouncementStatus } from '../enums/announcement.enum';

type AnnouncementWithRelations = Prisma.AnnouncementGetPayload<{
  include: {
    author: true;
  };
}>;

/**
 * AnnouncementMapper utility class for converting between Prisma models and entities
 */
export class AnnouncementMapper {
  /**
   * Converts Prisma Announcement model to AnnouncementEntity
   */
  static toEntity(prismaAnnouncement: Announcement): AnnouncementEntity {
    const entity = new AnnouncementEntity();
    entity.id = prismaAnnouncement.id;
    entity.title = prismaAnnouncement.title;
    entity.type = prismaAnnouncement.type as EAnnouncementType;
    entity.isFixed = prismaAnnouncement.isFixed;
    entity.imageUrl = prismaAnnouncement.imageUrl;
    entity.content = prismaAnnouncement.content;
    entity.authorId = prismaAnnouncement.authorId;
    entity.authorName = prismaAnnouncement.authorName;
    entity.views = prismaAnnouncement.views;
    entity.status = prismaAnnouncement.status as EAnnouncementStatus;
    entity.createdAt = prismaAnnouncement.createdAt;
    entity.updatedAt = prismaAnnouncement.updatedAt;
    
    return entity;
  }

  /**
   * Converts Prisma Announcement model with author relation to AnnouncementEntity
   */
  static toEntityWithAuthor(prismaAnnouncement: AnnouncementWithRelations): AnnouncementEntity {
    const entity = this.toEntity(prismaAnnouncement);
    
    // Map author if included
    if (prismaAnnouncement.author) {
      entity.author = {
        id: prismaAnnouncement.author.id,
        name: prismaAnnouncement.author.name,
        email: prismaAnnouncement.author.email,
        phoneNumber: prismaAnnouncement.author.phoneNumber,
      } as any;
    } else {
      entity.author = null;
    }
    
    return entity;
  }

  /**
   * Converts array of Prisma Announcement models to AnnouncementEntity array
   */
  static toEntityList(prismaAnnouncements: Announcement[]): AnnouncementEntity[] {
    return prismaAnnouncements.map((announcement) => this.toEntity(announcement));
  }

  /**
   * Converts array of Prisma Announcement models with author relations to AnnouncementEntity array
   */
  static toEntityListWithAuthor(prismaAnnouncements: AnnouncementWithRelations[]): AnnouncementEntity[] {
    return prismaAnnouncements.map((announcement) => this.toEntityWithAuthor(announcement));
  }
}

