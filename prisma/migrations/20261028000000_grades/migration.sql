-- Grade Categories (a Course's Grade Scheme) and Grade Entries, for Current Grade (issue #8).
-- Purely additive, so it is safe to apply to existing data with `prisma migrate deploy`.
-- Deleting a Course cascades to its Categories and Entries; deleting a Category cascades to
-- its Entries.

CREATE TABLE "GradeCategory" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GradeEntry" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pointsEarned" DOUBLE PRECISION NOT NULL,
    "pointsPossible" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GradeCategory_courseId_idx" ON "GradeCategory"("courseId");

CREATE INDEX "GradeEntry_courseId_idx" ON "GradeEntry"("courseId");

CREATE INDEX "GradeEntry_categoryId_idx" ON "GradeEntry"("categoryId");

ALTER TABLE "GradeCategory" ADD CONSTRAINT "GradeCategory_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GradeEntry" ADD CONSTRAINT "GradeEntry_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GradeEntry" ADD CONSTRAINT "GradeEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GradeCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
