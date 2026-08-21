export const PRODUCT_EVENTS = {
  CREATED: 'product.created',
} as const;

export type ProductCreatedEventPayload = {
  productId: string;
};
