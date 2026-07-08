-- CreateTable
CREATE TABLE "ScheduleClass" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "daysOfWeek" INTEGER[],
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleClass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleClass_userId_idx" ON "ScheduleClass"("userId");

-- AddForeignKey
ALTER TABLE "ScheduleClass" ADD CONSTRAINT "ScheduleClass_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
