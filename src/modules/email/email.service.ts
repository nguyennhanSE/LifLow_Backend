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

      const subject = '라이플로우 서비스 가입 안내';
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

      const subject = '계정 정보 변경 안내 – 라이플로우';
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

      const subject = '비밀번호 변경 안내 – 라이플로우';
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
        <title>라이플로우 서비스 가입 안내</title>
        <style>
          body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', Arial, sans-serif; line-height: 1.6; color: #333; }
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
            <h1>라이플로우 서비스 가입 안내</h1>
          </div>
          <div class="content">
            <p>안녕하세요 ${user.name} 님, 회원님의 Liflow 계정이 생성되었습니다.</p>
            <p>아래의 계정 정보를 확인하신 후 로그인해 주시기 바랍니다.</p>
            
            <div class="credentials">
              <h3>계정 정보</h3>
              <p><strong>이메일:</strong> ${user.email}</p>
              <p><strong>비밀번호:</strong> ${plainPassword}</p>
            </div>

            <div class="warning">
              <strong>보안 안내</strong>
              <ul>
                <li>최초 로그인 후 반드시 비밀번호를 변경해 주시기 바랍니다.</li>
                <li>계정 정보는 타인에게 공유하지 마시고 안전하게 관리해 주십시오.</li>
                <li>본 계정 생성에 대해 인지하지 못하신 경우, 즉시 고객 지원팀으로 문의해 주시기 바랍니다.</li>
              </ul>
            </div>

            <p>위 계정 정보를 통해 라이플로우 서비스 이용이 가능합니다.</p>
            <p>서비스 이용 중 문의사항이 있으신 경우, 주왕산가든 채널톡 CS문의하기로 연락해 주시기 바랍니다.</p>
          </div>
          <div class="footer">
            <p>본 메일은 라이플로우 시스템에서 자동 발송된 메일로, 회신이 불가합니다.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getWelcomeEmailText(user: SendEmailDto, plainPassword: string): string {
    return `
라이플로우 서비스 가입 안내

안녕하세요 ${user.name} 님, 회원님의 Liflow 계정이 생성되었습니다.
아래의 계정 정보를 확인하신 후 로그인해 주시기 바랍니다.

계정 정보
이메일: ${user.email}
비밀번호: ${plainPassword}

보안 안내
- 최초 로그인 후 반드시 비밀번호를 변경해 주시기 바랍니다.
- 계정 정보는 타인에게 공유하지 마시고 안전하게 관리해 주십시오.
- 본 계정 생성에 대해 인지하지 못하신 경우, 즉시 고객 지원팀으로 문의해 주시기 바랍니다.

위 계정 정보를 통해 라이플로우 서비스 이용이 가능합니다.
서비스 이용 중 문의사항이 있으신 경우, 주왕산가든 채널톡 CS문의하기로 연락해 주시기 바랍니다.

본 메일은 라이플로우 시스템에서 자동 발송된 메일로, 회신이 불가합니다.
    `;
  }

  private getUserUpdatedEmailTemplate(user: SendEmailDto, changes: string[]): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>계정 정보 변경 안내 – 라이플로우</title>
        <style>
          body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', Arial, sans-serif; line-height: 1.6; color: #333; }
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
            <h1>계정 정보 변경 안내</h1>
          </div>
          <div class="content">
            <p>안녕하세요 ${user.name} 님, 회원님의 라이플로우 계정 정보가 변경되었습니다.</p>
            <p>변경된 내용은 아래와 같습니다.</p>
            
            <div class="changes">
              <ul>
                ${changes.map(change => `<li>${change}</li>`).join('')}
              </ul>
            </div>

            <p>해당 변경 사항을 요청한 적이 없거나 이상이 있다고 판단되시는 경우, 즉시 주왕산가든 채널톡 CS문의하기로 문의해 주시기 바랍니다.</p>
            <p>감사합니다.</p>
          </div>
          <div class="footer">
            <p>본 메일은 라이플로우 시스템에서 자동으로 발송된 메일입니다.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getUserUpdatedEmailText(user: SendEmailDto, changes: string[]): string {
    return `
계정 정보 변경 안내 – 라이플로우

안녕하세요 ${user.name} 님, 회원님의 라이플로우 계정 정보가 변경되었습니다.

변경된 내용은 아래와 같습니다.
${changes.map(change => `• ${change}`).join('\n')}

해당 변경 사항을 요청한 적이 없거나 이상이 있다고 판단되시는 경우, 즉시 주왕산가든 채널톡 CS문의하기로 문의해 주시기 바랍니다.

감사합니다.

본 메일은 라이플로우 시스템에서 자동으로 발송된 메일입니다.
    `;
  }

  private getPasswordChangedEmailTemplate(user: SendEmailDto): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>비밀번호 변경 안내 – 라이플로우</title>
        <style>
          body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .password { background-color: #fff; padding: 15px; border-left: 4px solid #FF9800; margin: 20px 0; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>비밀번호 변경 안내</h1>
          </div>
          <div class="content">
            <p>안녕하세요 ${user.name} 님, 회원님의 라이플로우 계정 비밀번호가 변경되었습니다.</p>

            <div class="password">
              <h3>새 비밀번호</h3>
              <p><code style="background: #eee; padding: 6px 10px; border-radius: 4px; font-size: 14px;">${user.password}</code></p>
            </div>

            <p>위 비밀번호로 로그인하신 후, 보안을 위해 반드시 비밀번호를 다시 변경해 주시기 바랍니다.</p>
            
            <div class="warning">
              <strong>보안 안내</strong>
              <ul>
                <li>본 비밀번호 변경을 요청한 적이 없으신 경우, 즉시 주왕산가든 채널톡 CS문의하기로 문의해 주시기 바랍니다.</li>
                <li>계정 보안을 위해 다음 로그인 후 비밀번호를 재설정하시기를 권장드립니다.</li>
                <li>계정 정보는 타인에게 공유하지 마시고 안전하게 관리해 주십시오.</li>
              </ul>
            </div>

            <p>감사합니다.</p>
          </div>
          <div class="footer">
            <p>본 메일은 라이플로우 시스템에서 자동으로 발송된 메일입니다.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordChangedEmailText(user: SendEmailDto): string {
    return `
비밀번호 변경 안내 – 라이플로우

안녕하세요 ${user.name} 님, 회원님의 라이플로우 계정 비밀번호가 변경되었습니다.

새 비밀번호
${user.password}

위 비밀번호로 로그인하신 후, 보안을 위해 반드시 비밀번호를 다시 변경해 주시기 바랍니다.

보안 안내
- 본 비밀번호 변경을 요청한 적이 없으신 경우, 즉시 주왕산가든 채널톡 CS문의하기로 문의해 주시기 바랍니다.
- 계정 보안을 위해 다음 로그인 후 비밀번호를 재설정하시기를 권장드립니다.
- 계정 정보는 타인에게 공유하지 마시고 안전하게 관리해 주십시오.

감사합니다.

본 메일은 라이플로우 시스템에서 자동으로 발송된 메일입니다.
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
