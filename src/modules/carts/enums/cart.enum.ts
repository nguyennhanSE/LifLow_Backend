/**
 * Cart status enumeration
 * Represents the current state of a shopping cart
 */
export enum ECartStatus {
  /** Cart is active and can be modified */
  ACTIVE = 'ACTIVE',
  /** Cart has been checked out and converted to an order */
  CHECKED_OUT = 'CHECKED_OUT',
}

export enum ECartItemStatus {
  /** Cart item is pending and can be modified */
  ACTIVE = 'ACTIVE',
  /** Cart item has been checked out and converted to an order */
  CHECKED_OUT = 'CHECKED_OUT',
}