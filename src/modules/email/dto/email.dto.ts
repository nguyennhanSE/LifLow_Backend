export interface SendEmailDto {
    id: string;
    name: string;
    email: string;
    phone?: string | null;

    bankName: string;
    bankAccountNumber: string;
    blackMode?: boolean;

    avatarUrl?: string | null;


    password: string;
    createdAt: Date;
    deletedAt?: Date | null;
}