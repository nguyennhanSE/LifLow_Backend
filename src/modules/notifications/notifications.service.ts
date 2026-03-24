import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FcmService } from './services/fcm.service';
import { NotificationType } from '@prisma/client';
import { SaveFcmTokenDto } from './dto/save-fcm-token.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
  ) {}

  /**
   * Save or update FCM token for user
   */
  async saveToken(userId: string, dto: SaveFcmTokenDto) {
    const existing = await this.prisma.fcmToken.findUnique({
      where: { token: dto.token },
    });

    if (existing) {
      if (existing.userId === userId) {
        await this.prisma.fcmToken.update({
          where: { id: existing.id },
          data: {
            deviceId: dto.deviceId,
            platform: dto.platform,
            isActive: true,
          },
        });
        return { success: true, message: 'Token updated' };
      }
      // Token belongs to another user - deactivate and create new
      await this.prisma.fcmToken.update({
        where: { id: existing.id },
        data: { isActive: false },
      });
    }

    await this.prisma.fcmToken.upsert({
      where: { token: dto.token },
      create: {
        userId,
        token: dto.token,
        deviceId: dto.deviceId,
        platform: dto.platform,
      },
      update: {
        userId,
        deviceId: dto.deviceId,
        platform: dto.platform,
        isActive: true,
      },
    });

    return { success: true, message: 'Token saved' };
  }

  /**
   * Remove FCM token (e.g. on logout)
   */
  async removeToken(userId: string, token: string) {
    const result = await this.prisma.fcmToken.updateMany({
      where: { userId, token },
      data: { isActive: false },
    });
    return { success: result.count > 0, message: 'Token removed' };
  }

  /**
   * Send notification to user(s) (admin)
   */
  async sendNotification(dto: SendNotificationDto) {
    const type = (dto.type ?? 'GENERAL') as NotificationType;

    const dataForFcm: Record<string, string> = dto.data
      ? Object.fromEntries(
          Object.entries(dto.data).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
        )
      : {};

    const results: { userId: string; sent: boolean; notificationId?: string }[] = [];

    for (const userId of dto.userIds) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        results.push({ userId, sent: false });
        continue;
      }

      const notification = await this.prisma.notification.create({
        data: {
          userId,
          title: dto.title,
          body: dto.body,
          type,
          data: (dto.data ?? undefined) as object | undefined,
        },
      });

      const tokens = await this.prisma.fcmToken.findMany({
        where: { userId, isActive: true },
        select: { token: true },
      });

      const tokenList = tokens.map((t) => t.token);

      if (tokenList.length === 0) {
        this.logger.debug(`[sendNotification] userId=${userId}: No FCM tokens - user must call POST /notifications/token first`);
      }
      if (!this.fcmService.isInitialized()) {
        this.logger.debug(`[sendNotification] userId=${userId}: FCM not initialized - check FIREBASE_* env vars`);
      }

      if (tokenList.length > 0 && this.fcmService.isInitialized()) {
        const sendResult = await this.fcmService.sendToTokens(
          tokenList,
          dto.title,
          dto.body,
          { ...dataForFcm, notificationId: notification.id },
        );

        if (sendResult.invalidTokens.length > 0) {
          await this.prisma.fcmToken.updateMany({
            where: { token: { in: sendResult.invalidTokens } },
            data: { isActive: false },
          });
        }

        if (sendResult.successCount > 0) {
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: { sentAt: new Date() },
          });
        }

        results.push({
          userId,
          sent: sendResult.successCount > 0,
          notificationId: notification.id,
        });
      } else {
        results.push({
          userId,
          sent: false,
          notificationId: notification.id,
        });
      }
    }

    return { results };
  }

  /**
   * List notifications for current user
   */
  async list(userId: string, query: QueryNotificationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: { userId: string; isRead?: boolean } = { userId };
    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }

    const [total, notifications] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      notifications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      unreadCount,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return { success: true };
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId },
      data: { isRead: true },
    });
    return { success: true, updatedCount: result.count };
  }

  /**
   * Send notification to a single user (internal use - e.g. from order service)
   */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    type: NotificationType = 'GENERAL',
    data?: Record<string, unknown>,
  ) {
    this.logger.debug(`[sendToUser] Called: userId=${userId}, title="${title}", body="${body}"`);

    const tokens = await this.prisma.fcmToken.findMany({
      where: { userId, isActive: true },
      select: { token: true },
    });
    this.logger.debug(
      `[sendToUser] User ${userId} has ${tokens.length} active FCM token(s), FCM initialized=${this.fcmService.isInitialized()}`,
    );

    const result = await this.sendNotification({
      userIds: [userId],
      title,
      body,
      type: type as string,
      data,
    });

    this.logger.debug(`[sendToUser] Result for userId=${userId}:`, JSON.stringify(result));
    return result;
  }
}
