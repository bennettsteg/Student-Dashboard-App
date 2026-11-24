/**
 * What a push carries. Deliberately generic: a count, never Assignment titles, so little
 * detail passes through Apple's (or any) push relay. Tapping always opens Assignments.
 */
export interface PushPayload {
  title: string;
  body: string;
  /** Same-origin path opened when the notification is tapped. */
  url: string;
}

const TITLE = "StudyDesk";
const ASSIGNMENTS_URL = "/assignments";

function dueTodayBody(dueTodayCount: number, prefix: string): string {
  if (!Number.isInteger(dueTodayCount) || dueTodayCount < 1) {
    throw new Error("A Reminder needs at least one Assignment due today.");
  }
  const noun = dueTodayCount === 1 ? "assignment" : "assignments";
  return `${prefix}${dueTodayCount} ${noun} due today`;
}

/** The Morning Reminder. Only ever built when at least one Assignment is due today. */
export function buildMorningReminderPayload(dueTodayCount: number): PushPayload {
  return { title: TITLE, body: dueTodayBody(dueTodayCount, ""), url: ASSIGNMENTS_URL };
}

/** The Last-chance Reminder: a final nudge late in the day. Same count-only constraint. */
export function buildLastChanceReminderPayload(dueTodayCount: number): PushPayload {
  return { title: TITLE, body: dueTodayBody(dueTodayCount, "Last chance: "), url: ASSIGNMENTS_URL };
}

/** Sent from Settings to confirm a device receives pushes. */
export function buildTestPayload(): PushPayload {
  return {
    title: TITLE,
    body: "Test reminder: this device will get your daily Reminders.",
    url: ASSIGNMENTS_URL,
  };
}
