-- DropForeignKey
ALTER TABLE "ScheduleClass" DROP CONSTRAINT IF EXISTS "ScheduleClass_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "ScheduleClass";

-- DropIndex
DROP INDEX IF EXISTS "Course_userId_externalRef_key";

-- AlterTable Course: drop externalRef, add schedule fields (nullable first for backfill)
ALTER TABLE "Course" DROP COLUMN IF EXISTS "externalRef";
ALTER TABLE "Course" ADD COLUMN "location" TEXT;
ALTER TABLE "Course" ADD COLUMN "daysOfWeek" INTEGER[] NOT NULL DEFAULT '{}';
ALTER TABLE "Course" ADD COLUMN "startTime" TEXT;
ALTER TABLE "Course" ADD COLUMN "endTime" TEXT;

UPDATE "Course" SET "startTime" = '' WHERE "startTime" IS NULL;
UPDATE "Course" SET "endTime" = '' WHERE "endTime" IS NULL;

ALTER TABLE "Course" ALTER COLUMN "startTime" SET NOT NULL;
ALTER TABLE "Course" ALTER COLUMN "endTime" SET NOT NULL;
ALTER TABLE "Course" ALTER COLUMN "daysOfWeek" DROP DEFAULT;

-- AlterTable CalendarEvent: add Blackboard reference course name
ALTER TABLE "CalendarEvent" ADD COLUMN "sourceCourseName" TEXT;
