-- Add the optional instructor shown on each Course card. Additive and nullable, so it is
-- safe to apply to existing rows with `prisma migrate deploy`.
ALTER TABLE "Course" ADD COLUMN "instructor" TEXT;
