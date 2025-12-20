import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { EmailConfig, EmailData, IEmailService } from '../../../modules/email/email.interface';
import { config } from '../../config';

@Injectable()
export class NodemailerService implements IEmailService {
    private readonly logger = new Logger(NodemailerService.name);
    private transporter: nodemailer.Transporter;

    constructor() {
        this.initializeTransporter();
    }

    private initializeTransporter() {
        // Validate email credentials
        const emailUser = config.EMAIL_USER?.trim();
        const emailPassword = config.EMAIL_PASSWORD?.trim();

        if (!emailUser || !emailPassword) {
            this.logger.warn(
                'Email credentials are missing. Please set EMAIL_USER and EMAIL_PASSWORD in your .env file.',
                {
                    hasUser: !!emailUser,
                    hasPassword: !!emailPassword,
                }
            );
        }

        // Parse port to number (handle string from env)
        let port: number;
        if (typeof config.EMAIL_PORT === 'string') {
            const parsedPort = parseInt(config.EMAIL_PORT, 10);
            port = isNaN(parsedPort) ? 465 : parsedPort;
        } else {
            port = config.EMAIL_PORT || 465;
        }

        // Parse secure to boolean (handle string "true"/"false" from env)
        let secure: boolean;
        if (typeof config.EMAIL_SECURE === 'string') {
            secure = config.EMAIL_SECURE.toLowerCase() === 'true';
        } else {
            secure = config.EMAIL_SECURE ?? true;
        }

        const emailConfig: EmailConfig = {
            host: config.EMAIL_HOST || 'smtp.naver.com',
            port,
            secure,
            auth: {
                user: emailUser || '',
                pass: emailPassword || '',
            },
        };

        this.transporter = nodemailer.createTransport(emailConfig);
        this.logger.log('Nodemailer transporter initialized', {
            host: emailConfig.host,
            port: emailConfig.port,
            secure: emailConfig.secure,
            user: emailConfig.auth.user ? `${emailConfig.auth.user.substring(0, 3)}***` : 'NOT SET',
        });
    }

    async sendEmail(data: EmailData): Promise<boolean> {
        try {
            // Validate email credentials before sending
            const emailUser = config.EMAIL_USER?.trim();
            const emailPassword = config.EMAIL_PASSWORD?.trim();

            if (!emailUser || !emailPassword) {
                this.logger.error(
                    'Cannot send email: Email credentials are missing. Please set EMAIL_USER and EMAIL_PASSWORD in your .env file.',
                    {
                        to: data.to,
                    }
                );
                return false;
            }

            // Use provided from address or fallback to configured email user
            // Naver requires the From address to match the authenticated user
            const from = data.from || emailUser;
            
            if (!from) {
                this.logger.error('Email sender address is required', { to: data.to });
                return false;
            }

            const mailOptions = {
                from,
                to: data.to,
                subject: data.subject,
                html: data.html,
                text: data.text,
            };

            const result = await this.transporter.sendMail(mailOptions);
            this.logger.log(`Email sent successfully to ${data.to}`, { 
                messageId: result.messageId,
                from,
            });
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorCode = error && typeof error === 'object' && 'code' in error 
                ? (error as { code?: string }).code 
                : undefined;
            
            this.logger.error(
                `Failed to send email to ${data.to}`,
                {
                    error: errorMessage,
                    code: errorCode,
                    stack: error instanceof Error ? error.stack : undefined,
                }
            );
            return false;
        }
    }

}


