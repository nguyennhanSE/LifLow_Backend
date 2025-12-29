import { SetMetadata } from '@nestjs/common';
import { EPermissions } from 'src/modules/permissions/enum/permissions.enum';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for a route
 * @param permissions - One or more EPermissions values
 * @example
 * @Permissions(EPermissions.DASHBOARD_ACCESS)
 * @Permissions(EPermissions.MEMBER_MANAGEMENT, EPermissions.PRODUCT_MANAGEMENT)
 */
export const Permissions = (...permissions: (EPermissions | string)[]) => SetMetadata(PERMISSIONS_KEY, permissions);

