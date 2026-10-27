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
  /** The earliest due day, formatted in the profile timezone (e.g. "Tue, Oct 27"), or null. */
  nextDueLabel: string | null;
  /** Current Grade as a percentage, or null until the Course has a Grade Entry. */
  currentGrade: number | null;
}
