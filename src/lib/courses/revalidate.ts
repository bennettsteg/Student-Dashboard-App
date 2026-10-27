import { revalidatePath } from "next/cache";

/**
 * Re-renders every page that shows Courses (or data hanging off them) after a Course is
 * added, edited or dropped. Call from a server action.
 */
export function revalidateCourseViews(): void {
  revalidatePath("/courses", "layout"); // the Courses list and each Course's detail page
  revalidatePath("/schedule");
  revalidatePath("/assignments");
  revalidatePath("/calendar");
  revalidatePath("/");
}
