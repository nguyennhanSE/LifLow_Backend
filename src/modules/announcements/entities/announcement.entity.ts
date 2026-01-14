import { EAnnouncementType, EAnnouncementStatus } from '../enums/announcement.enum';
import { UserEntity } from '../../user/entities/user.entity';

export class AnnouncementEntity {
  id!: string;

  title!: string;

  type!: EAnnouncementType;

  isFixed!: boolean;

  imageUrl?: string | null;

  content!: string;

  authorId?: string | null;

  authorName?: string | null;

  views!: number;

  status!: EAnnouncementStatus;

  createdAt!: Date;

  updatedAt!: Date;

  // Relations
  author?: UserEntity | null;
}
