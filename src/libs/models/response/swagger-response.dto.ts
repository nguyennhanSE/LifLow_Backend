import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
    @ApiProperty({ description: 'Access token' })
    accessToken: string;

    @ApiProperty({ description: 'Refresh token' })
    refreshToken: string;

    @ApiProperty({ description: 'User information' })
    user: {
        id: string;
        email: string;
        name: string;
    };
}

export class UserResponseDto {
    @ApiProperty({ description: 'User ID' })
    id: string;

    @ApiProperty({ description: 'User name' })
    name: string;

    @ApiProperty({ description: 'User email' })
    email: string;

    @ApiProperty({ description: 'User phone', required: false })
    phone?: string;

    @ApiProperty({ description: 'Bank name', required: false })
    bankName?: string;

    @ApiProperty({ description: 'Bank account number', required: false })
    bankAccountNumber?: string;

    @ApiProperty({ description: 'Creation date' })
    createdAt: Date;

    @ApiProperty({ description: 'Deleted at', required: false })
    deletedAt?: Date | null;
}

export class PaginatedUserResponseDto {
    @ApiProperty({ description: 'List of users', type: [UserResponseDto] })
    docs: UserResponseDto[];

    @ApiProperty({ description: 'Total number of users' })
    total: number;

    @ApiProperty({ description: 'Current page' })
    page: number;

    @ApiProperty({ description: 'Number of items per page' })
    limit: number;

    @ApiProperty({ description: 'Total number of pages' })
    totalPages: number;
}

export class RoleResponseDto {
    @ApiProperty({ description: 'Role ID' })
    id: string;

    @ApiProperty({ description: 'Role name' })
    name: string;

    @ApiProperty({ description: 'Role description', required: false })
    description?: string;

    @ApiProperty({ description: 'Creation date' })
    createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    updatedAt: Date;
}

export class UserRoleResponseDto {
    @ApiProperty({ description: 'User ID' })
    userId: string;

    @ApiProperty({ description: 'Role names', type: [String] })
    roles: string[];
}

export class SuccessResponseDto {
    @ApiProperty({ description: 'Success status' })
    success: boolean;
}

export class ErrorResponseDto {
    @ApiProperty({ description: 'Error message' })
    message: string;

    @ApiProperty({ description: 'Error code', required: false })
    code?: string;

    @ApiProperty({ description: 'Trace ID', required: false })
    traceId?: string;
}
