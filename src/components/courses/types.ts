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

export interface CourseCardDTO extends CourseScheduleDTO {
  instructor: string | null;
  openAssignments: number;
  /** ISO instant of the earliest Assignment not yet past due, or null. */
  nextDueAt: string | null;
  /** Current Grade as a percentage, or null until the Course has a Grade Entry. */
  currentGrade: number | null;
}
