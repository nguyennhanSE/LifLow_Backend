import { SetMetadata } from '@nestjs/common';

export const EVENT_LOG_METADATA_KEY = 'event-log-metadata';

export interface EventLogMetadata {
  eventType: string;
  eventEntity?: string;
  entityType?: string;
  entityId?: string | null;
  entityIdFrom?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export const TrackUserEvent = (metadata: EventLogMetadata) =>
  SetMetadata(EVENT_LOG_METADATA_KEY, metadata);
