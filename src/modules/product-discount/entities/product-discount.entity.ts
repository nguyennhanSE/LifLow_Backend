export class ProductDiscountEntity {
    id: string;
    status: boolean;
    productId: string;
    discountRate: number;
    discountStartDate?: Date | null;
    discountEndDate?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
