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

/** The daily Reminder. Only ever built when at least one Assignment is due today. */
export function buildReminderPayload(dueTodayCount: number): PushPayload {
  if (!Number.isInteger(dueTodayCount) || dueTodayCount < 1) {
    throw new Error("A Reminder needs at least one Assignment due today.");
  }
  const noun = dueTodayCount === 1 ? "assignment" : "assignments";
  return { title: TITLE, body: `${dueTodayCount} ${noun} due today`, url: ASSIGNMENTS_URL };
}

/** Sent from Settings to confirm a device receives pushes. */
export function buildTestPayload(): PushPayload {
  return {
    title: TITLE,
    body: "Test reminder: this device will get your daily Reminders.",
    url: ASSIGNMENTS_URL,
  };
}
