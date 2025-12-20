import { UserEntity } from '../../user/entities/user.entity';
import { EOrderSituation } from '../enum/order.enum';

export class OrderEntity {
  id!: string;
  orderNumber!: string;
  itemWiseOrderNumber!: string;
  totalOrderAmount!: number;
  totalPaymentAmount!: number;
  productNumber!: number;
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
  user?: UserEntity | null;
  // Extensions
  situation?: EOrderSituation | null;
  courierCompany?: string | null;
}

