-- Replace the general-purpose "CalendarEvent" table with a lean "Assignment" table
-- (ADR-0001: assignments are entered by hand, Blackboard sync is gone).
--
-- BACK UP THE DATABASE BEFORE APPLYING (see docs/deployment/assignment-migration.md).
-- This migration is destructive: Blackboard-synced events and manual non-assignment
-- events are deleted for good, and "CalendarEvent" is dropped.
--
-- Hand-written so it can be applied with `prisma migrate deploy` (no shadow database).
-- The DDL for steps 1 and 5 is what `prisma migrate diff` generates; steps 2-4 are the
-- data conversion.

-- 1. Create the new table (empty) alongside the old one.
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Assignment_userId_dueAt_idx" ON "Assignment"("userId", "dueAt");

CREATE INDEX "Assignment_courseId_idx" ON "Assignment"("courseId");

ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Delete Blackboard-synced events. Everything left in "CalendarEvent" is MANUAL.
DELETE FROM "CalendarEvent" WHERE "source" = 'BLACKBOARD_ICS';

-- 3. Give every user who has a manual assignment with no Course a visible
--    "Unassigned (migrated)" Course to hold them, so nothing is silently lost.
--    It has no meeting days, so it never appears on the Schedule; the student can rename
--    or drop it from the Courses page. Users with no orphaned assignments get none.
INSERT INTO "Course" ("id", "userId", "name", "color", "daysOfWeek", "startTime", "endTime", "createdAt")
SELECT
    'unassigned_' || md5("userId" || clock_timestamp()::text || random()::text),
    "userId",
    'Unassigned (migrated)',
    '#6b7280',
    ARRAY[]::INTEGER[],
    '',
    '',
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT "userId"
    FROM "CalendarEvent"
    WHERE "isAssignment" = true AND "status" = 'ACTIVE' AND "courseId" IS NULL
) AS "orphan_users";

-- 4. Convert manual assignment events into Assignments, keeping their ids. The due time
--    comes from the old "dueAt" (falling back to "startAt" for a row that never had one),
--    the old "description" becomes "notes", and orphans go to the Course created above.
--    Manual non-assignment events are not converted: dropping the table discards them.
INSERT INTO "Assignment" ("id", "userId", "courseId", "title", "notes", "dueAt", "createdAt")
SELECT
    e."id",
    e."userId",
    COALESCE(
        e."courseId",
        (
            SELECT c."id"
            FROM "Course" c
            WHERE c."userId" = e."userId" AND c."name" = 'Unassigned (migrated)'
            ORDER BY c."createdAt" DESC, c."id"
            LIMIT 1
        )
    ),
    e."title",
    e."description",
    COALESCE(e."dueAt", e."startAt"),
    e."createdAt"
FROM "CalendarEvent" e
WHERE e."isAssignment" = true AND e."status" = 'ACTIVE';

-- 5. Drop the old table and its enums.
ALTER TABLE "CalendarEvent" DROP CONSTRAINT "CalendarEvent_courseId_fkey";

ALTER TABLE "CalendarEvent" DROP CONSTRAINT "CalendarEvent_userId_fkey";

DROP TABLE "CalendarEvent";

DROP TYPE "EventSource";

DROP TYPE "EventStatus";
