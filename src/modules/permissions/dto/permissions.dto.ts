import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { EPermissions } from '../enum/permissions.enum';

export class UserPermissionsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  [EPermissions.DASHBOARD_ACCESS]?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  [EPermissions.MEMBER_MANAGEMENT]?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  [EPermissions.PRODUCT_MANAGEMENT]?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  [EPermissions.ORDER_MANAGEMENT]?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  [EPermissions.RECIPE_MANAGEMENT]?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  [EPermissions.BANNER_MANAGEMENT]?: boolean;
}

export class UpdateUserPermissionsDto {
  @ApiProperty({
    description: 'Permissions object',
    example: {
      [EPermissions.DASHBOARD_ACCESS]: true,
      [EPermissions.MEMBER_MANAGEMENT]: true,
      [EPermissions.PRODUCT_MANAGEMENT]: false,
      [EPermissions.ORDER_MANAGEMENT]: false,
      [EPermissions.RECIPE_MANAGEMENT]: false,
      [EPermissions.BANNER_MANAGEMENT]: false,
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
    enum: EPermissions,
    example: EPermissions.MEMBER_MANAGEMENT
  })
  @IsEnum(EPermissions)
  @IsNotEmpty()
  permission!: EPermissions;
}

