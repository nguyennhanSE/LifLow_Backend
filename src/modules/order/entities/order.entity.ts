import { UserEntity } from '../../user/entities/user.entity';
import { EOrderSituation } from '../enum/order.enum';
import { ProductEntity } from '../../product/entities/product.entity';

export class OrderEntity {
  id!: string;
  orderNumber!: string;
  itemWiseOrderNumber!: string;
  totalOrderAmount!: number;
  totalPaymentAmount!: number;
  productId!: string;
  productName!: string;
  productNameWithOptions!: string;
  quantity!: number;
  recipient!: string;
  recipientAddressFull!: string;
  recipientPostalCode!: number;
  recipientMobilePhone!: string;
  recipientPhoneNumber!: string;
  deliveryMessage!: string;
  salePrice!: number;
  paymentType!: string;
  paymentMethod!: string;
  orderDate!: string;
  ordererName!: string;
  ordererMobilePhone!: string;
  ordererId?: string | null;
  desiredDeliveryDate!: string;
  membershipLevelAtOrderTime!: string;
  orderStatus?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  // Extensions
  user?: UserEntity | null;
  product?: ProductEntity | null;
  situation?: EOrderSituation | null;
  courierCompany?: string | null;
  invoiceNumber?: string | null;
}

