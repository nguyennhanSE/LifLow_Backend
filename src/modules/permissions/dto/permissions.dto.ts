import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UserPermissionsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  dashboardAccess?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  memberAccess?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  productAccess?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  orderAccess?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  recipeAccess?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  bannerAccess?: boolean;
}

export class UpdateUserPermissionsDto {
  @ApiProperty({
    description: 'Permissions object',
    example: {
      dashboardAccess: true,
      memberAccess: true,
      productAccess: false
    }
  })
  @IsObject()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => UserPermissionsDto)
  permissions!: UserPermissionsDto;
}

export class BulkUpdatePermissionItem {
  @ApiProperty()
  @IsUUID('4')
  @IsNotEmpty()
  userId!: string;

  @ApiProperty()
  @IsObject()
  @ValidateNested()
  @Type(() => UserPermissionsDto)
  permissions!: UserPermissionsDto;
}

export class BulkUpdatePermissionsDto {
  @ApiProperty({ type: [BulkUpdatePermissionItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdatePermissionItem)
  users!: BulkUpdatePermissionItem[];
}

export class CheckPermissionDto {
  @ApiProperty()
  @IsUUID('4')
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    description: 'Permission to check from EPermissions enum',
    example: 'MEMBER_MANAGEMENT_READ'
  })
  @IsString()
  @IsNotEmpty()
  permission!: string;
}

