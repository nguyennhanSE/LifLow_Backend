import { UserEntity } from '../../user/entities/user.entity';
import { OrderEntity } from '../../order/entities/order.entity';

export class PointEntity {
  id!: string;
  date?: string | null;
  userId?: string | null;
  membershipLevel?: string | null;
  content?: string | null;
  orderNumber?: string | null;
  pointsType?: string | null;
  availablePointsIncrease?: number | null;
  availablePointsDeduction?: number | null;
  availablePointsBalance?: number | null;
  createdAt!: Date;
  updatedAt!: Date;

  // Relations
  user?: UserEntity | null;
  order?: OrderEntity | null;
}
