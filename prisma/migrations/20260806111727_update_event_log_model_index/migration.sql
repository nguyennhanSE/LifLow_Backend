-- DropIndex
DROP INDEX "user_event_logs_entity_type_entity_id_occurred_at_idx";

-- DropIndex
DROP INDEX "user_event_logs_event_type_occurred_at_idx";

-- DropIndex
DROP INDEX "user_event_logs_occurred_at_idx";

-- DropIndex
DROP INDEX "user_event_logs_session_id_occurred_at_idx";

-- DropIndex
DROP INDEX "user_event_logs_user_id_occurred_at_idx";

-- CreateIndex
CREATE INDEX "user_event_logs_event_id_idx" ON "user_event_logs"("event_id");

-- CreateIndex
CREATE INDEX "user_event_logs_event_id_event_type_idx" ON "user_event_logs"("event_id", "event_type");

-- CreateIndex
CREATE INDEX "user_event_logs_event_id_event_type_loki_pushed_at_idx" ON "user_event_logs"("event_id", "event_type", "loki_pushed_at");
