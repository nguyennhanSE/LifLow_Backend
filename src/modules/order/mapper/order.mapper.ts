import { Order, Product, User } from '@prisma/client';
import { OrderResponseDto } from '../dto/order.dto';
import { OrderEntity } from '../entities/order.entity';
// import { toUserEntity } from '../../user/mapper/user.mapper';
import { EOrderSituation } from '../enum/order.enum';
import { toUserEntity } from 'src/modules/user/mapper/user.mapper';
import { toProductEntity, toProductEntitySummary } from 'src/modules/product/mapper/product.mapper';
import { ProductEntity } from 'src/modules/product/entities/product.entity';
// type OrderWithUser = Order & { user?: User | null };

type OrderWithRelations = Order & { user?: User | null; product?: Product | null };

export function toOrderEntity(order: Order): OrderEntity {
  return {
    id: order.id,
    cartId: order.cartId,
    orderNumber: order.orderNumber,
    orderGroupNumber: order.orderGroupNumber,
    totalOrderAmount: order.totalOrderAmount,
    totalPaymentAmount: order.totalPaymentAmount,
    productId: order.productId,
    productName: order.productName,
    productNameWithOptions: order.productNameWithOptions,
    quantity: order.quantity,
    recipient: order.recipient,
    recipientAddressFull: order.recipientAddressFull,
    recipientPostalCode: order.recipientPostalCode,
    recipientMobilePhone: order.recipientMobilePhone,
    recipientPhoneNumber: order.recipientPhoneNumber,
    deliveryMessage: order.deliveryMessage,
    salePrice: order.salePrice,
    paymentType: order.paymentType,
    paymentMethod: order.paymentMethod,
    orderDate: order.orderDate,
    ordererName: order.ordererName,
    ordererMobilePhone: order.ordererMobilePhone,
    ordererId: order.ordererId,
    desiredDeliveryDate: order.desiredDeliveryDate,
    membershipLevelAtOrderTime: order.membershipLevelAtOrderTime,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    // user: order.user ? toUserEntity(order.user) : null,
    situation: order.situation as EOrderSituation,
    courierCompany: order.courierCompany,
    invoiceNumber: order.invoiceNumber,
    couponUsed: order.couponUsed,
    discountAmount: order.discountAmount,
  };
}

export function toOrderResponseDto(order: OrderEntity): OrderResponseDto {
  return {
    ...order,
    ordererId: order.ordererId ?? null, // Convert undefined to null
  } as OrderResponseDto;
}

export function toOrderEntityWithRelations(order: OrderWithRelations): OrderEntity {
  return {
    ...toOrderEntity(order),
    user: order.user ? toUserEntity(order.user) : null,
    product: order.product ? toProductEntitySummary(toProductEntity(order.product)) : null,
  };
}

