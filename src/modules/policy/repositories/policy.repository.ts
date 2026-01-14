import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreatePolicyDto } from '../dto/create-policy.dto';
import { UpdatePolicyDto } from '../dto/update-policy.dto';
import { PolicyEntity } from '../entities/policy.entity';
import { PolicyMapper } from '../mappers/policy.mapper';
import { EPolicyStatus } from '../enums/policy.enum';

@Injectable()
export class PolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<any[]> {
    const policies = await this.prisma.policy.findMany({
      orderBy: { updatedAt: 'desc' },
      where: { status: EPolicyStatus.ACTIVE },
    });
    return PolicyMapper.toEntityList(policies as any[]);
  }

  async findOne(id: string): Promise<any> {
    const policy = await this.prisma.policy.findUnique({ where: { id } });
    return policy ? PolicyMapper.toEntity(policy) : null;
  }

  async findActive(): Promise<any> {
    const policy = await this.prisma.policy.findFirst({
      where: { status: EPolicyStatus.ACTIVE },
      orderBy: { updatedAt: 'desc' },
    });
    return policy ? PolicyMapper.toEntity(policy) : null;
  }

  async create(dto: CreatePolicyDto): Promise<any> {
    const created = await this.prisma.$transaction(async (tx) => {
      // Ensure at any time only one policy is active:
      // deactivate currently active policy(ies), then create the new active one.
      await tx.policy.updateMany({
        where: { status: EPolicyStatus.ACTIVE },
        data: { status: EPolicyStatus.INACTIVE },
      });

      const policy = await tx.policy.create({
        data: {
          status: EPolicyStatus.ACTIVE,
          paymentInformation: dto.paymentInformation,
          deliveryInformation: dto.deliveryInformation,
          exchangeInformation: dto.exchangeInformation,
        },
      });

      return policy;
    });

    return PolicyMapper.toEntity(created);
  }

  async update(id: string, dto: UpdatePolicyDto): Promise<any> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.policy.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException(`Policy with ID ${id} not found`);
      }

      const data: any = {
        ...(dto.paymentInformation !== undefined && {
          paymentInformation: dto.paymentInformation,
        }),
        ...(dto.deliveryInformation !== undefined && {
          deliveryInformation: dto.deliveryInformation,
        }),
        ...(dto.exchangeInformation !== undefined && {
          exchangeInformation: dto.exchangeInformation,
        }),
      };

      return tx.policy.update({
        where: { id },
        data,
      });
    });

    return PolicyMapper.toEntity(updated);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.policy.delete({ where: { id } });
  }
}


