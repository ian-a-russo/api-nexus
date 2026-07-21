-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('IMAGE', 'VIDEO');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "attachmentMimeType" TEXT,
ADD COLUMN     "attachmentSize" INTEGER,
ADD COLUMN     "attachmentType" "AttachmentType",
ADD COLUMN     "attachmentUrl" TEXT,
ALTER COLUMN "text" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT;
