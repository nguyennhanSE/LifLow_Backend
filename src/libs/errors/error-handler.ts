
import { BadRequestException, ForbiddenException, HttpStatus, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { BaseError, DataProcessError, DuplicateKeyError, UnknowError } from "./error-base";
import { Prisma } from '@prisma/client';

export const handleErrors = (error) => {
    if (error instanceof BaseError) {
        return error;
    }
    throw new UnknowError('', error);
}


export function handlePrismaError(
    error: Prisma.PrismaClientKnownRequestError, errorCode: string = ''
): never {
    switch (error.code) {
        case "P2002": // Unique constraint failed
            throw new DuplicateKeyError(errorCode, {
                message: `Duplicate entry found for a unique field: ${error.message}`,
                code: error.code,
                codeName: error.name,
                stack: error.stack

            });


        case "P2003": // Foreign key constraint failed
            throw new DataProcessError(errorCode, {
                message: `Invalid foreign key reference: ${error.message}`,
                stack: error.stack,
                code: error.code,
                codeName: error.name,
            });


        case "P2023": // Invalid date-time format
            throw new DataProcessError(errorCode, {
                message: `Invalid date-time format: ${error.message}`,
                stack: error.stack,
                code: error.code,
                codeName: error.name,
            });


        case "P2000": // Value too long for the column
            throw new DataProcessError(errorCode, {
                message: `Value is too long for this field: ${error.message}`,
                stack: error.stack,
                code: error.code,
                codeName: error.name,
            });


        // Add more cases for different Prisma errors
        default:
            throw new DataProcessError(errorCode, {
                message: `An unexpected error occurred:${error.message}`,
                stack: error.stack,
                code: error.code,
                codeName: error.name,
            });

    }
}