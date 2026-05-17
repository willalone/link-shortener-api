-- Align with TZ: shortCode, isActive, UserRole, clickedAt

CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'USER';
UPDATE "User" SET "role" = 'ADMIN'::"UserRole" WHERE "isAdmin" = true;
ALTER TABLE "User" DROP COLUMN IF EXISTS "isAdmin";
ALTER TABLE "User" RENAME COLUMN "passwordHash" TO "password";

ALTER TABLE "Link" RENAME COLUMN "alias" TO "shortCode";
ALTER TABLE "Link" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
UPDATE "Link" SET "isActive" = false WHERE "status" = 'BLOCKED';
ALTER TABLE "Link" DROP COLUMN IF EXISTS "status";

ALTER TABLE "Click" RENAME COLUMN "createdAt" TO "clickedAt";

-- Default cache TTL hint: 300 seconds in .env.example
