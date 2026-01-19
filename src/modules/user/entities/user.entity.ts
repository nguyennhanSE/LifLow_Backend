export class UserEntity {
  id!: string; // ID is unique and also serves as username
  password?: string | null;
  name!: string;
  age?: number | null;
  membershipLevel?: string | null;
  email?: string;
  phoneNumber?: string; // @map("phone_number")
  mobilePhoneNumber?: string; // @map("mobile_phone_number")
  totalPurchaseAmount?: number | null; // @map("total_purchase_amount")
  totalUsedPoints?: number; // @map("total_used_points")
  availablePoints?: number; // @map("available_points")
  registrationDate?: string; // @map("registration_date") // Join Date
  dormancyDate?: string | null; // @map("dormancy_date") // Date account marked inactive
  withdrawalDate?: string | null; // @map("withdrawal_date")
  withdrawalType?: string | null; // @map("withdrawal_type")
  reasonForWithdrawal?: string | null; // @map("reason_for_withdrawal")
  createdAt?: Date | null; // @map("created_at")
  updatedAt?: Date | null; // @map("updated_at")
  roles?: RoleInfo[]; // Roles from userRole table
  permissions?: PermissionInfo[]; // Permissions from rolePermission table
  situation?: 'Active' | 'Dormant' | 'Withdrawn'; // Account status
  membership?: MembershipInfo | null; // Memberships from userMembership table
  // Extensions
  orderNumber?: number; // Order number from order table
  nickName?: string | null; // @map("nick_name")
  statusMessage?: string | null; // @map("status_message")
}

export class RoleInfo {
  id!: string;
  name!: string;
  description?: string | null;
}

export class PermissionInfo {
  id!: string;
  name!: string;
  description?: string | null;
}

export class MembershipInfo {
  id!: string;
  name!: string;
  description?: string | null;
}

