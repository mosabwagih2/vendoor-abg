import { weekStart } from "./week";

/**
 * When the weekly report goes out by itself: once per work week, at the end of the work day on Thursday.
 * If the worker was down at that moment it still sends on Friday (the week is over, Friday is the day off).
 * From Saturday the next week begins, so a missed one is not sent late.
 */
export interface ScheduleInput {
  /** Local date, "YYYY-MM-DD". */
  localDate: string;
  /** Minutes since local midnight. */
  localMinutes: number;
  /** End of the work day in minutes since midnight (17:00 = 1020). */
  endMin: number;
  enabled: boolean;
  /** Start key of the week that was last sent, or null. */
  lastSentWeek: string | null;
}

const weekday = (key: string) => new Date(`${key}T00:00:00Z`).getUTCDay();

/** The week start key to send now, or null when nothing is due. */
export function dueWeeklySend(i: ScheduleInput): string | null {
  if (!i.enabled) return null;
  const day = weekday(i.localDate);
  const week = weekStart(i.localDate);
  if (week === i.lastSentWeek) return null;
  if (day === 4) return i.localMinutes >= i.endMin ? week : null; // Thursday after work ends
  if (day === 5) return week; // Friday: catch up
  return null;
}

/** "5:00 PM" for the dialog and settings text. */
export function clockLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
