-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "user_1_id" TEXT NOT NULL,
    "user_2_id" TEXT,
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "sender_id" TEXT,
    "content" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rooms_user_1_id_idx" ON "rooms"("user_1_id");

-- CreateIndex
CREATE INDEX "rooms_user_2_id_idx" ON "rooms"("user_2_id");

-- CreateIndex
CREATE INDEX "rooms_last_message_at_idx" ON "rooms"("last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_user_1_id_user_2_id_key" ON "rooms"("user_1_id", "user_2_id");

-- CreateIndex
CREATE INDEX "messages_room_id_idx" ON "messages"("room_id");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");

-- CreateIndex
CREATE INDEX "messages_room_id_created_at_idx" ON "messages"("room_id", "created_at");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_user_1_id_fkey" FOREIGN KEY ("user_1_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_user_2_id_fkey" FOREIGN KEY ("user_2_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
