import { UserEntity } from '../../user/entities/user.entity';
import { EOrderSituation } from '../enum/order.enum';
import { ProductEntity } from '../../product/entities/product.entity';

export class OrderEntity {
  id!: string;
  cartId?: string | null;
  orderNumber?: string | null;
  orderGroupNumber?: string | null;
  totalOrderAmount?: number | null;
  totalPaymentAmount?: number | null;
  productId?: string | null;
  productName?: string | null;
  productNameWithOptions?: string | null;
  quantity?: number | null;
  recipient?: string | null;
  recipientAddressFull?: string | null;
  recipientPostalCode?: number | null;
  recipientMobilePhone?: string | null;
  recipientPhoneNumber?: string | null;
  deliveryMessage?: string | null;
  salePrice?: number | null;
  paymentType?: string | null;
  paymentMethod?: string | null;
  orderDate?: string | null;
  ordererName?: string | null;
  ordererMobilePhone?: string | null;
  ordererId?: string | null;
  desiredDeliveryDate?: string | null;
  membershipLevelAtOrderTime?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;

  // Extensions
  user?: UserEntity | null;
  product?: ProductEntity | null;
  situation?: EOrderSituation | null;
  courierCompany?: string | null;
  invoiceNumber?: string | null;
  orderGroup?: OrderGroupEntity | null;
  couponUsed?: string[] | null;
  discountAmount?: number | null;
}

export class OrderGroupEntity {
  orderGroupNumber!: string;
  orderGroupName?: string | null;
  originalAmount?: number | null;
  discountAmount?: number | null;
  ordererId?: string | null;
  situation?: EOrderSituation | null;
  finalAmount?: number | null;
  pointsUsed?: number | null;
  cartItemIds?: string[] | null;
  deliveryFee?: number | null;
  courierCompany?: string | null;
  invoiceNumber?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  
  // Relations
  user?: UserEntity | null;
  orders?: OrderEntity[] | null;
}