-- DropIndex
DROP INDEX "messages_room_id_created_at_idx";

-- CreateIndex
CREATE INDEX "messages_room_id_created_at_id_idx" ON "messages"("room_id", "created_at" DESC, "id" DESC);
