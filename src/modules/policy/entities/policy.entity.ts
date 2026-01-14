import { EPolicyStatus } from '../enums/policy.enum';

export class PolicyEntity {
  id!: string;

  status!: EPolicyStatus;

  paymentInformation!: string;

  deliveryInformation!: string;

  exchangeInformation!: string;

  createdAt!: Date;

  updatedAt!: Date;
}
