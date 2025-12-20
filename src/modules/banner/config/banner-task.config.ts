/**
 * Banner Task Configuration
 * 
 * Configuration for scheduled banner automation tasks.
 * These values can be overridden via environment variables.
 */

export interface BannerTaskConfig {
  /**
   * Enable or disable all banner scheduled tasks
   * Default: true
   * Environment variable: ENABLE_BANNER_TASKS
   */
  enabled: boolean;

  /**
   * Cron expression for activating scheduled banners
   * Default: '0 * * * *' (every hour)
   * Environment variable: BANNER_ACTIVATE_CRON
   */
  activateCron: string;

  /**
   * Cron expression for deactivating expired banners
   * Default: '0 * * * *' (every hour)
   * Environment variable: BANNER_DEACTIVATE_CRON
   */
  deactivateCron: string;

  /**
   * Cron expression for syncing product data
   * Default: '0 2 * * *' (daily at 2 AM)
   * Environment variable: BANNER_SYNC_CRON
   */
  syncCron: string;

  /**
   * Timezone for cron jobs
   * Default: 'Asia/Seoul'
   * Environment variable: BANNER_TASK_TIMEZONE
   */
  timezone: string;
}

/**
 * Default banner task configuration
 */
export const defaultBannerTaskConfig: BannerTaskConfig = {
  enabled: true,
  activateCron: '0 * * * *', // Every hour
  deactivateCron: '0 * * * *', // Every hour
  syncCron: '0 2 * * *', // Daily at 2 AM
  timezone: 'Asia/Seoul',
};

/**
 * Get banner task configuration from environment variables
 * Falls back to defaults if not set
 */
export function getBannerTaskConfig(): BannerTaskConfig {
  return {
    enabled: process.env.ENABLE_BANNER_TASKS !== 'false',
    activateCron:
      process.env.BANNER_ACTIVATE_CRON || defaultBannerTaskConfig.activateCron,
    deactivateCron:
      process.env.BANNER_DEACTIVATE_CRON ||
      defaultBannerTaskConfig.deactivateCron,
    syncCron: process.env.BANNER_SYNC_CRON || defaultBannerTaskConfig.syncCron,
    timezone:
      process.env.BANNER_TASK_TIMEZONE || defaultBannerTaskConfig.timezone,
  };
}

// Cron expression format: minute hour day month day-of-week
// Examples:
// - '0 * * * *'    - Every hour at minute 0
// - '0 0 * * *'    - Every day at midnight
// - '0 2 * * *'    - Every day at 2 AM
// - '*/15 * * * *' - Every 15 minutes
// - '0 0 * * 0'    - Every Sunday at midnight
// - '0 0 1 * *'    - First day of every month at midnight
// Use online tools like crontab.guru for testing cron expressions

