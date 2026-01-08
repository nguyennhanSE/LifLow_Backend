import { UserEntity } from '../../user/entities/user.entity';

export class PointEntity {
  id!: string;
  date?: string | null;
  userId?: string | null;
  membershipLevel?: string | null;
  content?: string | null;
  orderGroupNumber?: string | null;
  pointsType?: string | null;
  availablePointsIncrease?: number | null;
  availablePointsDeduction?: number | null;
  availablePointsBalance?: number | null;
  createdAt!: Date;
  updatedAt!: Date;

  // Relations
  user?: UserEntity | null;
  orderGroup?: any | null;
}
