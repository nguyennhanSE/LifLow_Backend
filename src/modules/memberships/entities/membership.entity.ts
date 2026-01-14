export class MembershipEntity {
  id!: string;
  name!: string;
  nickName?: string | null;
  basePeriod?: number | null;
  description?: string | null;
  minPrice!: number;
  createdAt!: Date;
  updatedAt?: Date | null;
}

export class UserMembershipEntity {
  userId!: string;
  membershipId!: string;
  membershipName!: string;
  membershipDescription!: string;
  status!: string;
  startDate!: Date;
  endDate!: Date;
  createdAt!: Date;
  updatedAt?: Date | null;
  
  // Relations
  membership?: MembershipEntity;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}
