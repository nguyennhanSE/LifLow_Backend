import { Injectable, Logger } from '@nestjs/common';
import { NodemailerService } from '../../libs/integration/nodemailer/nodemailer.service';
import { SendEmailDto } from './dto/email.dto';

@Injectable()
export class UserEmailService {
  private readonly logger = new Logger(UserEmailService.name);

  constructor(private readonly nodemailerService: NodemailerService) { }

  async sendWelcomeEmail(user: SendEmailDto, plainPassword: string): Promise<boolean> {
    try {
      this.logger.log(`Sending welcome email to ${user.email}`, { userId: user.id, name: user.name });

      const subject = 'Welcome to Liflow - Your Account Has Been Created';
      const html = this.getWelcomeEmailTemplate(user, plainPassword);
      const text = this.getWelcomeEmailText(user, plainPassword);

      const result = await this.nodemailerService.sendEmail({
        to: user.email,
        subject,
        html,
        text,
      });

      if (result) {
        this.logger.log(`Welcome email sent successfully to ${user.email}`);
      } else {
        this.logger.error(`Failed to send welcome email to ${user.email}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Error sending welcome email to ${user.email}`, error);
      return false;
    }
  }

  async sendUserUpdatedEmail(user: SendEmailDto, changes: string[]): Promise<boolean> {
    try {
      this.logger.log(`Sending user updated email to ${user.email}`, { userId: user.id, changes });

      const subject = 'Your Account Has Been Updated - Liflow';
      const html = this.getUserUpdatedEmailTemplate(user, changes);
      const text = this.getUserUpdatedEmailText(user, changes);

      const result = await this.nodemailerService.sendEmail({
        to: user.email,
        subject,
        html,
        text,
      });

      if (result) {
        this.logger.log(`User updated email sent successfully to ${user.email}`);
      } else {
        this.logger.error(`Failed to send user updated email to ${user.email}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Error sending user updated email to ${user.email}`, error);
      return false;
    }
  }

  async sendPasswordChangedEmail(user: SendEmailDto): Promise<boolean> {
    try {
      this.logger.log(`Sending password changed email to ${user.email}`, { userId: user.id });

      const subject = 'Your Password Has Been Changed - Liflow';
      const html = this.getPasswordChangedEmailTemplate(user);
      const text = this.getPasswordChangedEmailText(user);

      const result = await this.nodemailerService.sendEmail({
        to: user.email,
        subject,
        html,
        text,
      });

      if (result) {
        this.logger.log(`Password changed email sent successfully to ${user.email}`);
      } else {
        this.logger.error(`Failed to send password changed email to ${user.email}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Error sending password changed email to ${user.email}`, error);
      return false;
    }
  }

  async sendNotificationEmail(user: SendEmailDto, subject: string, message: string): Promise<boolean> {
    try {
      this.logger.log(`Sending notification email to ${user.email}`, { userId: user.id, subject });

      const html = this.getNotificationEmailTemplate(user, subject, message);
      const text = this.getNotificationEmailText(user, subject, message);

      const result = await this.nodemailerService.sendEmail({
        to: user.email,
        subject,
        html,
        text,
      });

      if (result) {
        this.logger.log(`Notification email sent successfully to ${user.email}`);
      } else {
        this.logger.error(`Failed to send notification email to ${user.email}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Error sending notification email to ${user.email}`, error);
      return false;
    }
  }

  private getWelcomeEmailTemplate(user: SendEmailDto, plainPassword: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Liflow</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .credentials { background-color: #fff; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Liflow!</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.name}!</h2>
            <p>Your account has been successfully created by an administrator. Below are your login credentials:</p>
            
            <div class="credentials">
              <h3>Account Information</h3>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Password:</strong> ${plainPassword}</p>
            </div>

            <div class="warning">
              <strong>Important Security Notice:</strong>
              <ul>
                <li>Please change your password after your first login</li>
                <li>Keep your credentials secure and do not share them</li>
                <li>If you did not request this account, please contact support immediately</li>
              </ul>
            </div>

            <p>You can now log in to the system using the credentials above.</p>
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Liflow System</p>
            <p>Please do not reply to this email</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getWelcomeEmailText(user: SendEmailDto, plainPassword: string): string {
    return `
Welcome to Liflow!

Hello ${user.name}!

Your account has been successfully created by an administrator. Below are your login credentials:

Account Information:
Email: ${user.email}
Password: ${plainPassword}

Important Security Notice:
- Please change your password after your first login
- Keep your credentials secure and do not share them
- If you did not request this account, please contact support immediately

You can now log in to the system using the credentials above.

If you have any questions or need assistance, please don't hesitate to contact our support team.

This is an automated message from Liflow System
Please do not reply to this email
    `;
  }

  private getUserUpdatedEmailTemplate(user: SendEmailDto, changes: string[]): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Account Updated</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .changes { background-color: #fff; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Updated</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.name}!</h2>
            <p>Your account information has been updated by an administrator. The following changes were made:</p>
            
            <div class="changes">
              <h3>Changes Made:</h3>
              <ul>
                ${changes.map(change => `<li>${change}</li>`).join('')}
              </ul>
            </div>

            <p>If you did not request these changes or if you have any concerns, please contact our support team immediately.</p>
            <p>Best regards,<br>Liflow Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Liflow System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getUserUpdatedEmailText(user: SendEmailDto, changes: string[]): string {
    return `
Account Updated - Liflow

Hello ${user.name}!

Your account information has been updated by an administrator. The following changes were made:

${changes.map(change => `• ${change}`).join('\n')}

If you did not request these changes or if you have any concerns, please contact our support team immediately.

Best regards,
Liflow Team

This is an automated message from Liflow System
    `;
  }

  private getPasswordChangedEmailTemplate(user: SendEmailDto): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Changed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Changed</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.name}!</h2>
            <p>Your password has been changed by an administrator.</p>
            
            <div class="warning">
              <strong>Security Notice:</strong>
              <ul>
                <li>If you did not request this change, please contact support immediately</li>
                <li>For security reasons, we recommend that you change your password again after your next login</li>
                <li>Keep your account credentials secure</li>
              </ul>
            </div>

            <p>Best regards,<br>Liflow Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Liflow System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordChangedEmailText(user: SendEmailDto): string {
    return `
Password Changed - Liflow

Hello ${user.name}!

Your password has been changed by an administrator.

Security Notice:
- If you did not request this change, please contact support immediately
- For security reasons, we recommend that you change your password again after your next login
- Keep your account credentials secure

Best regards,
Liflow Team

This is an automated message from Liflow System
    `;
  }

  private getNotificationEmailTemplate(user: SendEmailDto, subject: string, message: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #9C27B0; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${subject}</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.name}!</h2>
            <p>${message}</p>
            <p>Best regards,<br>Liflow Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Liflow System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getNotificationEmailText(user: SendEmailDto, subject: string, message: string): string {
    return `
${subject} - Liflow

Hello ${user.name}!

${message}

Best regards,
Liflow Team

This is an automated message from Liflow System
    `;
  }
}
