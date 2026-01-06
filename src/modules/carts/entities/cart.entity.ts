import { ECartStatus } from '../enums/cart.enum';
import { UserEntity } from '../../user/entities/user.entity';
import { CartItemEntity } from './cart-item.entity';

/**
 * Cart entity representing a user's shopping cart
 * Maps to the 'carts' table in the database
 */
export class CartEntity {
  /** Unique identifier for the cart */
  id!: string;

  /** User ID that owns this cart (maps to user_id in database) */
  userId!: string;

  /** Current status of the cart (maps to status in database) */
  status!: ECartStatus;

  /** Total amount of all items in the cart (maps to total_amount in database) */
  totalAmount!: number;

  /** Timestamp when the cart was checked out (maps to checked_out_at in database) */
  checkedOutAt?: Date | null;

  /** Timestamp when the cart was created (maps to created_at in database) */
  createdAt!: Date;

  /** Timestamp when the cart was last updated (maps to updated_at in database) */
  updatedAt!: Date;

  // Relations

  /** User that owns this cart */
  user?: UserEntity | null;

  /** Array of items in this cart */
  cartItems?: CartItemEntity[] | null;
}
