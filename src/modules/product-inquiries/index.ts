/**
 * Product Inquiries Module
 * Barrel export for all product inquiry related components
 */

// Module
export * from './product-inquiries.module';

// Services
export * from './services/product-inquiries.service';
export * from './services/product-inquiry-answers.service';

// Controller
export * from './controllers/product-inquiries.controller';

// Repositories
export * from './repositories/product-inquiries.repository';
export * from './repositories/product-inquiry-answers.repository';

// Entities
export * from './entities/product-inquiry.entity';
export * from './entities/product-inquiry-answer.entity';

// DTOs
export * from './dto/create-product-inquiry.dto';
export * from './dto/update-product-inquiry.dto';
export * from './dto/query-product-inquiries.dto';
export * from './dto/product-inquiry-response.dto';
export * from './dto/create-product-inquiry-answer.dto';
export * from './dto/update-product-inquiry-answer.dto';
export * from './dto/product-inquiry-answer-response.dto';

// Mappers
export * from './mappers/product-inquiry.mapper';
export * from './mappers/product-inquiry-answer.mapper';

