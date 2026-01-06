import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CreateProductInquiryAnswerDto } from '../dto/create-product-inquiry-answer.dto';
import { UpdateProductInquiryAnswerDto } from '../dto/update-product-inquiry-answer.dto';
import { ProductInquiryAnswersRepository } from '../repositories/product-inquiry-answers.repository';
import { ProductInquiryAnswerMapper } from '../mappers/product-inquiry-answer.mapper';
import {
  ProductInquiryAnswerStandaloneResponseDto,
} from '../dto/product-inquiry-answer-response.dto';
import { ProductInquiryAnswerResponseDto } from '../dto/product-inquiry-response.dto';

/**
 * Service for managing product inquiry answers
 * Handles business logic and validation for product inquiry answers
 */
@Injectable()
export class ProductInquiryAnswersService {
  private readonly logger = new Logger(ProductInquiryAnswersService.name);

  constructor(
    private readonly productInquiryAnswersRepository: ProductInquiryAnswersRepository,
  ) {}

  /**
   * Create a new product inquiry answer
   * Validates that the inquiry exists
   * @param createDto - Data for creating the answer
   * @returns Created answer with relations
   */
  async create(
    inquiryId: string,
    createDto: CreateProductInquiryAnswerDto,
  ): Promise<ProductInquiryAnswerStandaloneResponseDto> {
    try {
      this.logger.log(
        `Creating answer for inquiry ${inquiryId}`,
      );

      // Validate answer content length
      if (createDto.answer.trim().length === 0) {
        throw new BadRequestException('Answer content cannot be empty');
      }

      // Optional: Check if inquiry already has an answer (uncomment if only one answer is allowed)
      // const existingAnswers = await this.productInquiryAnswersRepository.findByInquiryId(
      //   createDto.inquiryId,
      // );
      // if (existingAnswers.length > 0) {
      //   throw new BadRequestException(
      //     'This inquiry already has an answer. Please update the existing answer instead.',
      //   );
      // }

      // Create the answer (repository handles inquiry existence validation)
      const answerEntity = await this.productInquiryAnswersRepository.create(inquiryId, createDto);

      // Convert to response DTO
      const responseDto = ProductInquiryAnswerMapper.toStandaloneResponseDto(answerEntity);

      this.logger.log(`Answer created successfully: ID=${answerEntity.id}`);
      return responseDto;
    } catch (error) {
      this.logger.error(
        `Failed to create answer: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Find all product inquiry answers
   * @returns Array of all answers
   */
  async findAll(): Promise<ProductInquiryAnswerStandaloneResponseDto[]> {
    try {
      this.logger.log('Fetching all product inquiry answers');

      const answerEntities = await this.productInquiryAnswersRepository.findAll();

      return answerEntities.map((entity) =>
        ProductInquiryAnswerMapper.toStandaloneResponseDto(entity),
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch answers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Find a single product inquiry answer by ID
   * @param id - Answer ID
   * @returns Answer with relations
   */
  async findOne(id: string): Promise<ProductInquiryAnswerStandaloneResponseDto> {
    try {
      this.logger.log(`Fetching answer by ID: ${id}`);

      const answerEntity = await this.productInquiryAnswersRepository.findOne(id);

      if (!answerEntity) {
        throw new NotFoundException(`Answer with ID ${id} not found`);
      }

      return ProductInquiryAnswerMapper.toStandaloneResponseDto(answerEntity);
    } catch (error) {
      this.logger.error(
        `Failed to fetch answer ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Find all answers for a specific inquiry
   * @param inquiryId - Inquiry ID
   * @returns Array of answers for the inquiry
   */
  async findByInquiry(inquiryId: string): Promise<ProductInquiryAnswerResponseDto[]> {
    try {
      this.logger.log(`Fetching answers for inquiry: ${inquiryId}`);

      const answerEntities = await this.productInquiryAnswersRepository.findByInquiryId(
        inquiryId,
      );

      return answerEntities.map((entity) =>
        ProductInquiryAnswerMapper.toResponseDto(entity),
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch answers for inquiry ${inquiryId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Update a product inquiry answer
   * Typically restricted to admin users only
   * @param id - Answer ID
   * @param updateDto - Data to update
   * @returns Updated answer
   */
  async update(
    id: string,
    updateDto: UpdateProductInquiryAnswerDto,
  ): Promise<ProductInquiryAnswerStandaloneResponseDto> {
    try {
      this.logger.log(`Updating answer ${id}`);

      // Verify answer exists
      const existingAnswer = await this.productInquiryAnswersRepository.findOne(id);

      if (!existingAnswer) {
        throw new NotFoundException(`Answer with ID ${id} not found`);
      }

      // Validate answer content if provided
      if (updateDto.answer !== undefined) {
        if (updateDto.answer.trim().length === 0) {
          throw new BadRequestException('Answer content cannot be empty');
        }
      }

      // Update the answer
      const updatedEntity = await this.productInquiryAnswersRepository.update(
        id,
        updateDto,
      );

      this.logger.log(`Answer updated successfully: ID=${id}`);
      return ProductInquiryAnswerMapper.toStandaloneResponseDto(updatedEntity);
    } catch (error) {
      this.logger.error(
        `Failed to update answer ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Delete a product inquiry answer
   * Typically restricted to admin users only
   * @param id - Answer ID
   */
  async delete(id: string): Promise<void> {
    try {
      this.logger.log(`Deleting answer ${id}`);

      // Verify answer exists
      const existingAnswer = await this.productInquiryAnswersRepository.findOne(id);

      if (!existingAnswer) {
        throw new NotFoundException(`Answer with ID ${id} not found`);
      }

      // Delete the answer
      await this.productInquiryAnswersRepository.delete(id);

      this.logger.log(`Answer deleted successfully: ID=${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete answer ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Delete all answers for a specific inquiry
   * Useful when removing all answers for an inquiry
   * @param inquiryId - Inquiry ID
   */
  async deleteByInquiry(inquiryId: string): Promise<void> {
    try {
      this.logger.log(`Deleting all answers for inquiry ${inquiryId}`);

      await this.productInquiryAnswersRepository.deleteByInquiryId(inquiryId);

      this.logger.log(`All answers deleted for inquiry: ID=${inquiryId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete answers for inquiry ${inquiryId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get answer count for an inquiry
   * @param inquiryId - Inquiry ID
   * @returns Number of answers
   */
  async getAnswerCount(inquiryId: string): Promise<number> {
    try {
      return await this.productInquiryAnswersRepository.getAnswerCount(inquiryId);
    } catch (error) {
      this.logger.error(
        `Failed to get answer count: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get the first answer for an inquiry
   * @param inquiryId - Inquiry ID
   * @returns First answer or null
   */
  async getFirstAnswer(
    inquiryId: string,
  ): Promise<ProductInquiryAnswerStandaloneResponseDto | null> {
    try {
      const answerEntity = await this.productInquiryAnswersRepository.getFirstAnswer(
        inquiryId,
      );

      if (!answerEntity) {
        return null;
      }

      return ProductInquiryAnswerMapper.toStandaloneResponseDto(answerEntity);
    } catch (error) {
      this.logger.error(
        `Failed to get first answer: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get the latest answer for an inquiry
   * @param inquiryId - Inquiry ID
   * @returns Latest answer or null
   */
  async getLatestAnswer(
    inquiryId: string,
  ): Promise<ProductInquiryAnswerStandaloneResponseDto | null> {
    try {
      const answerEntity = await this.productInquiryAnswersRepository.getLatestAnswer(
        inquiryId,
      );

      if (!answerEntity) {
        return null;
      }

      return ProductInquiryAnswerMapper.toStandaloneResponseDto(answerEntity);
    } catch (error) {
      this.logger.error(
        `Failed to get latest answer: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}

