export interface CourseScheduleDTO {
  id: string;
  name: string;
  code: string | null;
  location: string | null;
  daysOfWeek: number[];
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  color: string | null;
}
