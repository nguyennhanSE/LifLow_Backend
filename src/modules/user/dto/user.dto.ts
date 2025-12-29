import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";
import { Transform } from "class-transformer";
import { trim, toLower } from "../../../utils/helper";
import { ERoleName } from "../../roles/enums/role.enum";

// Role filter options including 'ALL' for filtering by any role
const RoleFilterOptions = [...Object.values(ERoleName), 'ALL'] as const;
type RoleFilterType = ERoleName | 'ALL';
type AdminListFilterType = Exclude<ERoleName, ERoleName.USER> | 'ALL';
// Admin list filter options (excludes USER role)
const AdminListFilterOptions = [...Object.values(ERoleName).filter(role => role !== ERoleName.USER), 'ALL'] as const;
export class CreateUserDto {
    @ApiProperty({
        description: 'User full name',
        example: 'John Doe',
        maxLength: 100
    })
    @IsString() @IsNotEmpty() @trim() @MaxLength(100)
    name!: string;

    @ApiProperty({
        description: 'User email address',
        example: 'john.doe@gmail.com',
        format: 'email'
    })
    @IsEmail() @toLower() @trim()
    email!: string;

    @ApiPropertyOptional({ 
        description: 'User role (defaults to USER if not provided)',
        example: 'USER',
        enum: ERoleName
    })
    @IsOptional() 
    @IsEnum(ERoleName, { message: 'Role must be one of: ADMIN, GENERAL_MANAGER, MANAGER, MD, CS_MANAGER, USER' })
    role?: ERoleName;

    @ApiPropertyOptional({
        description: 'Phone number',
        example: '010-1234-5678'
    })
    @IsOptional() @IsString() @trim()
    phoneNumber?: string;
}
export class CreateUser extends CreateUserDto {
}

export class UpdateUserDto {
    @ApiPropertyOptional({ description: 'User full name', example: 'John Doe' })
    @IsOptional() 
    @IsString() 
    @IsNotEmpty() 
    @trim() 
    @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({ description: 'User email address', example: 'john.doe@gmail.com' })
    @IsOptional() 
    @IsEmail() 
    @trim()
    email?: string;

    @ApiPropertyOptional({ description: 'Phone number', example: '010-1234-5678' })
    @IsOptional() 
    @IsString() 
    @trim()
    phoneNumber?: string;

    @ApiPropertyOptional({ description: 'User role', enum: ERoleName })
    @IsOptional() 
    @IsEnum(ERoleName, { message: 'Role must be one of: ADMIN, GENERAL_MANAGER, MANAGER, MD, CS_MANAGER, USER' })
    role?: ERoleName;

    @ApiPropertyOptional({ description: 'Membership level', example: 'VIP' })
    @IsOptional() 
    @IsString()
    membershipLevel?: string;

    @ApiPropertyOptional({ description: 'User age', example: 30 })
    @IsOptional()
    age?: number;

    @ApiPropertyOptional({ description: 'Total used points', example: 1000 })
    @IsOptional()
    totalUsedPoints?: number;

    @ApiPropertyOptional({ description: 'Available points', example: 500 })
    @IsOptional()
    availablePoints?: number;

    @ApiPropertyOptional({ description: 'Dormancy date (inactive account)', example: '2024-01-01' })
    @IsOptional() 
    @IsString()
    dormancyDate?: string | null;

    @ApiPropertyOptional({ description: 'Withdrawal date', example: '2024-01-01' })
    @IsOptional() 
    @IsString()
    withdrawalDate?: string | null;

    @ApiPropertyOptional({ description: 'Withdrawal type', example: 'voluntary' })
    @IsOptional() 
    @IsString()
    withdrawalType?: string | null;

    @ApiPropertyOptional({ description: 'Reason for withdrawal', example: 'No longer needed' })
    @IsOptional() 
    @IsString()
    reasonForWithdrawal?: string | null;

    @ApiPropertyOptional({ description: 'Total purchase amount (in Korean Won)', example: 100000 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    totalPurchaseAmount?: number;

    @ApiPropertyOptional({ description: 'New password (will be hashed)', example: 'newPassword123' })
    @IsOptional() 
    @IsString() 
    @MinLength(8) 
    @MaxLength(128)
    password?: string;

}


export class UpdatePasswordDto {
    @IsString() @MinLength(8) @MaxLength(128)
    newPassword!: string; // new password to set
}

export class UserFilterDto {
    @ApiPropertyOptional({
        description: 'Search query string',
        example: 'john',
        maxLength: 100
    })
    @IsOptional() @IsString() @trim() @MaxLength(100)
    q?: string;

    @ApiPropertyOptional({
        description: 'Specific field to search in',
        example: 'name',
        maxLength: 100
    })
    @IsOptional() @IsString() @trim() @MaxLength(100)
    searchField?: string;

    @ApiPropertyOptional({
        description: 'Filter by email address',
        example: 'john.doe@gmail.com'
    })
    @IsOptional() @IsEmail() @toLower() @trim()
    email?: string;

    @ApiPropertyOptional({
        description: 'Filter by role',
        example: 'ADMIN',
        enum: RoleFilterOptions
    })
    @IsOptional()
    @IsEnum(RoleFilterOptions, { message: 'Role must be one of: ADMIN, GENERAL_MANAGER, MANAGER, MD, CS_MANAGER, USER, ALL' })
    role?: RoleFilterType;
}

export class GetUsersQueryDto {
    @ApiPropertyOptional({
        description: 'Page number for pagination (starts at 1)',
        example: '1',
        type: String
    })
    @IsOptional()
    @IsString()
    page?: string;

    @ApiPropertyOptional({
        description: 'Number of items per page',
        example: '10',
        type: String
    })
    @IsOptional()
    @IsString()
    limit?: string;

    @ApiPropertyOptional({
        description: 'Sort order',
        example: 'asc',
        enum: ['asc', 'desc']
    })
    @IsOptional()
    @IsString()
    sort?: 'asc' | 'desc';

    @ApiPropertyOptional({
        description: 'Field to sort by',
        example: 'createdAt',
        type: String
    })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiPropertyOptional({
        description: 'Whether to include total count in response',
        example: true,
        type: Boolean
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    counted?: boolean;

    @ApiPropertyOptional({
        description: 'Filter by role',
        example: 'ADMIN',
        enum: RoleFilterOptions
    })
    @IsOptional()
    @IsEnum(RoleFilterOptions, { message: 'Role must be one of: ADMIN, GENERAL_MANAGER, MANAGER, MD, CS_MANAGER, USER, ALL' })
    role?: RoleFilterType;

    @ApiPropertyOptional({
        description: 'Search query string (searches in name and email by default)',
        example: 'john',
        type: String
    })
    @IsOptional()
    @IsString()
    @trim()
    q?: string;

    @ApiPropertyOptional({
        description: 'Filter by specific email address',
        example: 'john.doe@gmail.com',
        type: String
    })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({
        description: 'Specific field to search in (e.g., "name", "email"). If provided, search query will only search in this field',
        example: 'name',
        type: String
    })
    @IsOptional()
    @IsString()
    @trim()
    searchField?: string;
}

export class GetAdminListQueryDto {
    @ApiPropertyOptional({
        description: 'Page number for pagination (starts at 1)',
        example: '1',
        type: String
    })
    @IsOptional()
    @IsString()
    page?: string;

    @ApiPropertyOptional({
        description: 'Number of items per page',
        example: '10',
        type: String
    })
    @IsOptional()
    @IsString()
    limit?: string;

    @ApiPropertyOptional({
        description: 'Sort order',
        example: 'asc',
        enum: ['asc', 'desc']
    })
    @IsOptional()
    @IsString()
    sort?: 'asc' | 'desc';

    @ApiPropertyOptional({
        description: 'Field to sort by',
        example: 'createdAt',
        type: String
    })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiPropertyOptional({
        description: 'Filter by role (excludes USER)',
        example: 'ADMIN',
        enum: AdminListFilterOptions
    })
    @IsOptional()
    @IsEnum(AdminListFilterOptions, { message: 'Role must be one of: ADMIN, GENERAL_MANAGER, MANAGER, MD, CS_MANAGER, ALL' })
    role?: AdminListFilterType;

    @ApiPropertyOptional({
        description: 'Search query string',
        example: 'john',
        type: String
    })
    @IsOptional()
    @IsString()
    @trim()
    q?: string;
}