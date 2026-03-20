import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { config } from 'libs/config';
import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private initialized = false;

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    if (admin.apps.length > 0) {
      this.initialized = true;
      this.logger.log('Firebase Admin already initialized');
      return;
    }

    const projectId = config.FIREBASE_PROJECT_ID;
    const clientEmail = config.FIREBASE_CLIENT_EMAIL;
    const privateKey = config.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'FCM not configured: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY required. Push notifications will be disabled.',
      );
      return;
    }

    try {
      const serviceAccount: ServiceAccount = {
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.initialized = true;
      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error as Error);
    }
  }

  /**
   * Send FCM notification to multiple tokens
   */
  async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ successCount: number; failureCount: number; invalidTokens: string[] }> {
    if (!this.initialized) {
      this.logger.warn('[sendToTokens] FCM not initialized, skipping send. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
      return { successCount: 0, failureCount: tokens.length, invalidTokens: tokens };
    }

    if (tokens.length === 0) {
      this.logger.debug('[sendToTokens] No tokens to send');
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    const message: admin.messaging.MulticastMessage = {
      notification: { title, body },
      data: data ? this.stringifyData(data) : undefined,
      tokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      const invalidTokens: string[] = [];

      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code === 'messaging/invalid-registration-token') {
          invalidTokens.push(tokens[idx]);
        }
        if (!resp.success && resp.error) {
          this.logger.debug(
            `[sendToTokens] Token[${idx}] failed: ${resp.error.code} - ${resp.error.message}`,
          );
        }
      });

      this.logger.debug(
        `[sendToTokens] Result: successCount=${response.successCount}, failureCount=${response.failureCount}, invalidTokens=${invalidTokens.length}`,
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error) {
      this.logger.error('FCM send failed', error as Error);
      return {
        successCount: 0,
        failureCount: tokens.length,
        invalidTokens: [],
      };
    }
  }

  /**
   * Send FCM notification to a single token
   */
  async sendToToken(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    const result = await this.sendToTokens([token], title, body, data);
    return result.successCount > 0;
  }

  private stringifyData(data: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) {
      result[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
    return result;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
