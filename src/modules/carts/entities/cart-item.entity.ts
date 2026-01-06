import { CartEntity } from './cart.entity';
import { ProductEntity } from '../../product/entities/product.entity';

/**
 * CartItem entity representing an item in a shopping cart
 * Maps to the 'cart_items' table in the database
 */
export class CartItemEntity {
  /** Unique identifier for the cart item */
  id!: string;

  /** ID of the cart this item belongs to (maps to cart_id in database) */
  cartId!: string;

  /** ID of the product in this cart item (maps to product_id in database) */
  productId!: string;

  /** Quantity of the product in the cart (maps to quantity in database) */
  quantity!: number;

  /** Sale price of the product at the time it was added to cart (maps to sale_price in database) */
  salePrice!: number;

  /** Timestamp when the cart item was created (maps to created_at in database) */
  createdAt!: Date;

  /** Timestamp when the cart item was last updated (maps to updated_at in database) */
  updatedAt!: Date;

  // Relations

  /** Cart that contains this item */
  cart?: CartEntity | null;

  /** Product associated with this cart item */
  product?: ProductEntity | null;
}

