import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma, ProductInquiryAnswers } from '@prisma/client';
import { CreateProductInquiryAnswerDto } from '../dto/create-product-inquiry-answer.dto';
import { UpdateProductInquiryAnswerDto } from '../dto/update-product-inquiry-answer.dto';
import { ProductInquiryAnswerEntity } from '../entities/product-inquiry-answer.entity';
import { ProductInquiryAnswerMapper } from '../mappers/product-inquiry-answer.mapper';

/**
 * Type for ProductInquiryAnswer with all relations
 */
export type ProductInquiryAnswerWithRelations = Prisma.ProductInquiryAnswersGetPayload<{
  include: {
    productInquiry: true;
  };
}>;

/**
 * Repository for ProductInquiryAnswers entity
 * Handles all database operations for product inquiry answers
 */
@Injectable()
export class ProductInquiryAnswersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new product inquiry answer
   * @param createDto - Data for creating the answer
   * @returns Created ProductInquiryAnswerEntity with relations
   */
  async create(inquiryId: string, createDto: CreateProductInquiryAnswerDto, authorId: string): Promise<ProductInquiryAnswerEntity> {
    try {
      // Verify inquiry exists
      const inquiry = await this.prisma.productInquiries.findUnique({
        where: { id: inquiryId },
      });
      if (!inquiry) {
        throw new NotFoundException(`Inquiry with ID ${inquiryId} not found`);
      }

      const [, answer] = await this.prisma.$transaction([
        this.prisma.productInquiries.update({
          where: { id: inquiryId },
          data: { status: 'completed' },
        }),
        this.prisma.productInquiryAnswers.create({
          data: {
            inquiryId: inquiryId,
            answer: createDto.answer,
            authorId: authorId,
          },
          include: {
            productInquiry: true,
          },
        }),
      ]);

      return ProductInquiryAnswerMapper.toEntityWithInquiry(answer);
    } catch (error) {
      // Handle Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('An answer with this configuration already exists');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Inquiry not found');
        }
      }
      throw error;
    }
  }

  /**
   * Find all product inquiry answers
   * @returns Array of ProductInquiryAnswerEntity
   */
  async findAll(): Promise<ProductInquiryAnswerEntity[]> {
    const answers = await this.prisma.productInquiryAnswers.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        productInquiry: true,
      },
    });

    return answers.map((answer) =>
      ProductInquiryAnswerMapper.toEntityWithInquiry(answer),
    );
  }

  /**
   * Find a single product inquiry answer by ID
   * @param id - Answer ID
   * @returns ProductInquiryAnswerEntity or null if not found
   */
  async findOne(id: string): Promise<ProductInquiryAnswerEntity | null> {
    const answer = await this.prisma.productInquiryAnswers.findUnique({
      where: { id },
      include: {
        productInquiry: true,
      },
    });

    if (!answer) {
      return null;
    }

    return ProductInquiryAnswerMapper.toEntityWithInquiry(answer);
  }

  /**
   * Find all answers for a specific inquiry
   * @param inquiryId - Inquiry ID
   * @returns Array of ProductInquiryAnswerEntity
   */
  async findByInquiryId(inquiryId: string): Promise<ProductInquiryAnswerEntity[]> {
    const answers = await this.prisma.productInquiryAnswers.findMany({
      where: { inquiryId },
      orderBy: { createdAt: 'asc' },
      include: {
        productInquiry: true,
      },
    });

    return answers.map((answer) =>
      ProductInquiryAnswerMapper.toEntityWithInquiry(answer),
    );
  }

  /**
   * Update a product inquiry answer
   * @param id - Answer ID
   * @param updateDto - Data to update
   * @returns Updated ProductInquiryAnswerEntity
   */
  async update(
    id: string,
    updateDto: UpdateProductInquiryAnswerDto,
  ): Promise<ProductInquiryAnswerEntity> {
    try {
      // Check if answer exists
      const existingAnswer = await this.findOne(id);
      if (!existingAnswer) {
        throw new NotFoundException(`Answer with ID ${id} not found`);
      }

      // Build update data object
      const data: Prisma.ProductInquiryAnswersUpdateInput = {};

      if (updateDto.answer !== undefined) {
        data.answer = updateDto.answer;
      }

      // Update the answer
      const answer = await this.prisma.productInquiryAnswers.update({
        where: { id },
        data,
        include: {
          productInquiry: true,
        },
      });

      return ProductInquiryAnswerMapper.toEntityWithInquiry(answer);
    } catch (error) {
      // Handle Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Answer with ID ${id} not found`);
        }
      }
      throw error;
    }
  }

  /**
   * Delete a product inquiry answer
   * @param id - Answer ID
   */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.productInquiryAnswers.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Answer with ID ${id} not found`);
        }
      }
      throw error;
    }
  }

  /**
   * Delete all answers for a specific inquiry
   * Useful when deleting an inquiry or clearing all answers
   * @param inquiryId - Inquiry ID
   * @returns Number of deleted answers
   */
  async deleteByInquiryId(inquiryId: string): Promise<void> {
    await this.prisma.productInquiryAnswers.deleteMany({
      where: { inquiryId },
    });
  }

  /**
   * Get answer count for an inquiry
   * @param inquiryId - Inquiry ID
   * @returns Number of answers
   */
  async getAnswerCount(inquiryId: string): Promise<number> {
    return await this.prisma.productInquiryAnswers.count({
      where: { inquiryId },
    });
  }

  /**
   * Get the first (earliest) answer for an inquiry
   * Useful for showing the initial response
   * @param inquiryId - Inquiry ID
   * @returns First ProductInquiryAnswerEntity or null if no answers
   */
  async getFirstAnswer(inquiryId: string): Promise<ProductInquiryAnswerEntity | null> {
    const answer = await this.prisma.productInquiryAnswers.findFirst({
      where: { inquiryId },
      orderBy: { createdAt: 'asc' },
      include: {
        productInquiry: true,
      },
    });

    if (!answer) {
      return null;
    }

    return ProductInquiryAnswerMapper.toEntityWithInquiry(answer);
  }

  /**
   * Get the latest answer for an inquiry
   * Useful for showing the most recent response
   * @param inquiryId - Inquiry ID
   * @returns Latest ProductInquiryAnswerEntity or null if no answers
   */
  async getLatestAnswer(inquiryId: string): Promise<ProductInquiryAnswerEntity | null> {
    const answer = await this.prisma.productInquiryAnswers.findFirst({
      where: { inquiryId },
      orderBy: { createdAt: 'desc' },
      include: {
        productInquiry: true,
      },
    });

    if (!answer) {
      return null;
    }

    return ProductInquiryAnswerMapper.toEntityWithInquiry(answer);
  }

  /**
   * Bulk delete answers by multiple inquiry IDs
   * Useful when deleting multiple inquiries at once
   * @param inquiryIds - Array of Inquiry IDs
   * @returns Number of deleted answers
   */
  async bulkDeleteByInquiryIds(inquiryIds: string[]): Promise<number> {
    const result = await this.prisma.productInquiryAnswers.deleteMany({
      where: {
        inquiryId: {
          in: inquiryIds,
        },
      },
    });

    return result.count;
  }
}

