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

