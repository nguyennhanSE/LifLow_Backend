import { Order, Product, User, OrderGroup } from '@prisma/client';
import { OrderResponseDto, OrderGroupResponseDto } from '../dto/order.dto';
import { OrderEntity, OrderGroupEntity } from '../entities/order.entity';
// import { toUserEntity } from '../../user/mapper/user.mapper';
import { EOrderSituation } from '../enum/order.enum';
import { toUserEntity } from 'src/modules/user/mapper/user.mapper';
import { toProductEntity, toProductEntitySummary } from 'src/modules/product/mapper/product.mapper';
import { ProductEntity } from 'src/modules/product/entities/product.entity';
// type OrderWithUser = Order & { user?: User | null };

type OrderWithRelations = Order & { user?: User | null; product?: Product | null };
type OrderGroupWithRelations = OrderGroup & { 
  user?: User | null; 
  orders?: (Order & { product?: Product | null })[] | null;
};

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
    // situation, courierCompany, invoiceNumber moved to OrderGroup - get from orderGroup relation if needed
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

// OrderGroup mappers
export function toOrderGroupEntity(orderGroup: OrderGroup): OrderGroupEntity {
  return {
    orderGroupNumber: orderGroup.orderGroupNumber,
    orderGroupName: orderGroup.orderGroupName,
    originalAmount: orderGroup.originalAmount,
    discountAmount: orderGroup.discountAmount,
    ordererId: orderGroup.ordererId,
    situation: orderGroup.situation as EOrderSituation,
    finalAmount: orderGroup.finalAmount,
    pointsUsed: orderGroup.pointsUsed,
    cartItemIds: orderGroup.cartItemIds,
    deliveryFee: orderGroup.deliveryFee,
    courierCompany: orderGroup.courierCompany,
    invoiceNumber: orderGroup.invoiceNumber,
    createdAt: orderGroup.createdAt,
    updatedAt: orderGroup.updatedAt,
  };
}

export function toOrderGroupResponseDto(orderGroup: OrderGroupEntity): OrderGroupResponseDto {
  return {
    orderGroupNumber: orderGroup.orderGroupNumber,
    orderGroupName: orderGroup.orderGroupName ?? null,
    originalAmount: orderGroup.originalAmount ?? null,
    discountAmount: orderGroup.discountAmount ?? null,
    finalAmount: orderGroup.finalAmount ?? null,
    pointsUsed: orderGroup.pointsUsed ?? null,
    cartItemIds: orderGroup.cartItemIds ?? null,
    deliveryFee: orderGroup.deliveryFee ?? null,
    ordererId: orderGroup.ordererId ?? null,
    situation: orderGroup.situation ?? null,
    courierCompany: orderGroup.courierCompany ?? null,
    invoiceNumber: orderGroup.invoiceNumber ?? null,
    createdAt: orderGroup.createdAt ?? null,
    updatedAt: orderGroup.updatedAt ?? null,
    user: orderGroup.user ?? null, 
    orders: orderGroup.orders?.map(order => toOrderResponseDto(order)) ?? null,
  };
}

export function toOrderGroupEntityWithRelations(orderGroup: OrderGroupWithRelations): OrderGroupEntity {
  const entity = toOrderGroupEntity(orderGroup);
  return {
    ...entity,
    user: orderGroup.user ? toUserEntity(orderGroup.user) : null,
    orders: orderGroup.orders?.map(order => {
      const orderEntity = toOrderEntity(order);
      return {
        ...orderEntity,
        product: order.product ? toProductEntitySummary(toProductEntity(order.product)) : null,
      };
    }) ?? null,
  };
}

