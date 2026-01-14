import { PolicyEntity } from '../entities/policy.entity';
import { EPolicyStatus } from '../enums/policy.enum';

export class PolicyMapper {
  // NOTE: avoid importing Prisma model types here to keep tooling happy in restricted environments.
  static toEntity(prismaPolicy: any): PolicyEntity {
    const entity = new PolicyEntity();
    entity.id = prismaPolicy.id;
    entity.status = prismaPolicy.status as EPolicyStatus;
    entity.paymentInformation = prismaPolicy.paymentInformation;
    entity.deliveryInformation = prismaPolicy.deliveryInformation;
    entity.exchangeInformation = prismaPolicy.exchangeInformation;
    entity.createdAt = prismaPolicy.createdAt;
    entity.updatedAt = prismaPolicy.updatedAt;
    return entity;
  }

  static toEntityList(prismaPolicies: any[]): PolicyEntity[] {
    return prismaPolicies.map((p) => this.toEntity(p));
  }
}


