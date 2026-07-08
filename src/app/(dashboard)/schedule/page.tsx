import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { AddClassForm } from "@/components/schedule/AddClassForm";
import { ScheduleGrid, type ScheduleClassDTO } from "@/components/schedule/ScheduleGrid";

export default async function SchedulePage() {
  const userId = await requireUserId();

  const classes = await prisma.scheduleClass.findMany({
    where: { userId },
    orderBy: { startTime: "asc" },
  });

  const classDTOs: ScheduleClassDTO[] = classes.map((cls) => ({
    id: cls.id,
    name: cls.name,
    location: cls.location,
    daysOfWeek: cls.daysOfWeek,
    startTime: cls.startTime,
    endTime: cls.endTime,
    color: cls.color,
  }));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-lg font-semibold">Schedule</h1>
      <AddClassForm />
      <ScheduleGrid classes={classDTOs} />
    </div>
  );
}
