import { ProductEntity } from '../../product/entities/product.entity';
import { UserEntity } from '../../user/entities/user.entity';
import { ProductInquiryAnswerEntity } from './product-inquiry-answer.entity';

/**
 * ProductInquiry entity representing a product inquiry
 * Maps to the 'product_inquiries' table in the database
 */
export class ProductInquiryEntity {
  /** Unique identifier for the inquiry */
  id!: string;

  /** Product ID this inquiry is about (maps to product_id in database) */
  productId!: string;

  /** User ID of the inquiry author (maps to author_id in database) */
  authorId!: string;

  /** Inquiry title (maps to title in database) */
  title!: string;

  /** Inquiry content text (maps to content in database) */
  content!: string;

  /** Timestamp when the inquiry was created (maps to created_at in database) */
  createdAt!: Date;

  /** Timestamp when the inquiry was last updated (maps to updated_at in database) */
  updatedAt!: Date;

  // Relations

  /** Product this inquiry is about */
  product?: ProductEntity | null;

  /** User who authored this inquiry */
  user?: UserEntity | null;

  /** Answers to this inquiry */
  productInquiryAnswers?: ProductInquiryAnswerEntity[];
}
