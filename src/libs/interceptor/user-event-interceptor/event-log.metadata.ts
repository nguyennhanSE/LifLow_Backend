import { SetMetadata } from '@nestjs/common';

export const EVENT_LOG_METADATA_KEY = 'event-log-metadata';

export enum UserEventType {
  AUTH_EVENT = 'auth_event',
  PRODUCT_EVENT = 'product_event',
  CART_EVENT = 'cart_event',
  ORDER_EVENT = 'order_event',
  PAYMENT_EVENT = 'payment_event',
  COUPON_EVENT = 'coupon_event',
  MEMBERSHIP_EVENT = 'membership_event',
  RECIPE_EVENT = 'recipe_event',
  USER_EVENT = 'user_event',
  SYSTEM_EVENT = 'system_event',
}

export interface EventLogMetadata {
  eventType: UserEventType;
  eventEntity?: string;
  entityType?: string;
  entityId?: string | null;
  entityIdFrom?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export const TrackUserEvent = (metadata: EventLogMetadata) =>
  SetMetadata(EVENT_LOG_METADATA_KEY, metadata);
