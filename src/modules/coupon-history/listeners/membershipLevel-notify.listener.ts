// import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
// import { Client } from 'pg';
// import { config } from 'libs/config';
// import { CouponHistoryService } from '../coupon-history.service';

// const CHANNEL = 'membership_level_updated';

// /** Minimal type for pg Client used by this listener to avoid eslint union-with-error-type. */
// type PgListenClient = Pick<
//   Client,
//   'connect' | 'query' | 'on' | 'end' | 'removeAllListeners'
// >;

// @Injectable()
// export class MembershipLevelNotifyListener implements OnModuleInit, OnModuleDestroy {
//   private readonly logger = new Logger(MembershipLevelNotifyListener.name);
//   private client: PgListenClient | null = null;

//   constructor(private readonly couponHistoryService: CouponHistoryService) {}

//   async onModuleInit() {
//     const client = new Client({ connectionString: config.DATABASE_URL });
//     this.client = client;
//     try {
//       await client.connect();
//       await client.query(`LISTEN ${CHANNEL}`);
//       client.on(
//         'notification',
//         (msg: { channel: string; payload?: string | null }) => this.onNotification(msg),
//       );
//       this.logger.log(`Listening on PostgreSQL channel: ${CHANNEL}`);
//     } catch (err) {
//       this.logger.error(`Failed to start LISTEN for ${CHANNEL}`, err);
//     }
//   }

//   private onNotification(msg: { channel: string; payload?: string | null }) {
//     this.logger.log(`Received notification on channel: ${msg.channel}, payload: ${msg.payload}`);
//     if (msg.channel !== CHANNEL || !msg.payload) return;
//     const userId = msg.payload.trim();
//     this.couponHistoryService.issueAfterUpdate(userId).catch((err) => {
//       this.logger.warn(`issueAfterUpdate failed for user ${userId}`, err?.message ?? err);
//     });
//   }

//   async onModuleDestroy() {
//     if (!this.client) return;
//     this.client.removeAllListeners('notification');
//     await this.client.end().catch(() => {});
//     this.client = null;
//     this.logger.log(`Stopped listening on ${CHANNEL}`);
//   }
// }