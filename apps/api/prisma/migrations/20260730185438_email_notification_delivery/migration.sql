-- AlterEnum
ALTER TYPE "NotificationStatus" ADD VALUE 'SENDING';

-- AlterTable
ALTER TABLE "NotificationLog" ADD COLUMN     "providerMessageId" TEXT;
