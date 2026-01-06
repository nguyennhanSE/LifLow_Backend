import { ProductInquiryEntity } from './product-inquiry.entity';

/**
 * ProductInquiryAnswer entity representing an answer to a product inquiry
 * Maps to the 'product_inquiry_answers' table in the database
 */
export class ProductInquiryAnswerEntity {
  /** Unique identifier for the answer */
  id!: string;

  /** Inquiry ID this answer belongs to (maps to inquiry_id in database) */
  inquiryId!: string;

  /** Answer content text (maps to answer in database) */
  answer!: string;

  /** Timestamp when the answer was created (maps to created_at in database) */
  createdAt!: Date;

  /** Timestamp when the answer was last updated (maps to updated_at in database) */
  updatedAt!: Date;

  // Relations

  /** Product inquiry this answer belongs to */
  productInquiry?: ProductInquiryEntity | null;
}

