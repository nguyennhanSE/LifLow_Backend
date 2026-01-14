/*
  Warnings:

  - You are about to drop the column `membershipLevel` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "membershipLevel",
ADD COLUMN     "membership_level" TEXT;
