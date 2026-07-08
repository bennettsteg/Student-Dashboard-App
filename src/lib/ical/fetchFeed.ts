import ical from "node-ical";

export async function fetchIcsFeed(url: string): Promise<ical.CalendarResponse> {
  return ical.async.fromURL(url);
}
