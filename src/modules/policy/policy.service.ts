import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PolicyRepository } from './repositories/policy.repository';
import { PolicyEntity } from './entities/policy.entity';

@Injectable()
export class PolicyService {
  constructor(private readonly policyRepository: PolicyRepository) {}

  async create(createPolicyDto: CreatePolicyDto): Promise<PolicyEntity> {
    return this.policyRepository.create(createPolicyDto);
  }

  async findAll(): Promise<PolicyEntity[]> {
    return this.policyRepository.findAll();
  }

  async findActive(): Promise<PolicyEntity> {
    return this.policyRepository.findActive();
  }

  async findOne(id: string): Promise<PolicyEntity> {
    const policy = await this.policyRepository.findOne(id);
    if (!policy) {
      throw new NotFoundException(`Policy with ID ${id} not found`);
    }
    return policy;
  }

  async update(id: string, updatePolicyDto: UpdatePolicyDto): Promise<PolicyEntity> {
    // repository already validates existence inside transaction; keeping findOne semantics consistent here
    await this.findOne(id);
    return this.policyRepository.update(id, updatePolicyDto);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.policyRepository.remove(id);
  }
}
