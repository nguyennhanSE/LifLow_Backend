-- CreateTable
CREATE TABLE "policy" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "payment_information" TEXT NOT NULL,
    "delivery_information" TEXT NOT NULL,
    "exchange_information" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policy_pkey" PRIMARY KEY ("id")
);
