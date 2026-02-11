export interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    requireTLS?: boolean;
    tls?: {
        rejectUnauthorized?: boolean;
        minVersion?: string;        
    };
}

export interface EmailTemplate {
    subject: string;
    html: string;
    text?: string;
}

export interface EmailData {
    to: string;
    from?: string;
    subject: string;
    html: string;
    text?: string;
}

export interface IEmailService {
    sendEmail(data: EmailData): Promise<boolean>;
}
