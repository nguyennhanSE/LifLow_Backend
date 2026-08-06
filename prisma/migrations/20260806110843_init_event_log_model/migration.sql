-- CreateTable
CREATE TABLE "user_event_logs" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_version" INTEGER NOT NULL DEFAULT 1,
    "user_id" TEXT,
    "anonymous_id" TEXT,
    "session_id" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "source" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "request_id" TEXT,
    "trace_id" TEXT,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loki_pushed_at" TIMESTAMP(3),
    "loki_push_error" TEXT,

    CONSTRAINT "user_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_event_logs_event_id_key" ON "user_event_logs"("event_id");

-- CreateIndex
CREATE INDEX "user_event_logs_event_type_occurred_at_idx" ON "user_event_logs"("event_type", "occurred_at");

-- CreateIndex
CREATE INDEX "user_event_logs_user_id_occurred_at_idx" ON "user_event_logs"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "user_event_logs_entity_type_entity_id_occurred_at_idx" ON "user_event_logs"("entity_type", "entity_id", "occurred_at");

-- CreateIndex
CREATE INDEX "user_event_logs_session_id_occurred_at_idx" ON "user_event_logs"("session_id", "occurred_at");

-- CreateIndex
CREATE INDEX "user_event_logs_occurred_at_idx" ON "user_event_logs"("occurred_at");

-- AddForeignKey
ALTER TABLE "user_event_logs" ADD CONSTRAINT "user_event_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
