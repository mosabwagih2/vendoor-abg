/** Work-week maths for the weekly report: Saturday to Thursday, Friday off. All dates are "YYYY-MM-DD" keys in the workspace timezone. */

const DAY = 86_400_000;
const parse = (key: string) => new Date(`${key}T00:00:00Z`);
const fmt = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(key: string, n: number): string {
  return fmt(new Date(parse(key).getTime() + n * DAY));
}

/** JS weekday of a date key: 0 = Sunday … 6 = Saturday. */
export function weekday(key: string): number {
  return parse(key).getUTCDay();
}

/** The Saturday that starts the work week containing `key`. Friday belongs to the week that just ended. */
export function weekStart(key: string): string {
  const back = (weekday(key) + 1) % 7; // Sat 0, Sun 1, … Fri 6
  return addDays(key, -back);
}

export interface WeekRange {
  /** Saturday. */
  start: string;
  /** Thursday, the last working day. */
  end: string;
  /** The seven day keys Saturday to Friday. */
  days: string[];
  /** Day keys that are worked (Friday is off). */
  workDays: string[];
}

export function weekRange(startKey: string): WeekRange {
  const start = weekStart(startKey);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return { start, end: days[5], days, workDays: days.slice(0, 6) };
}

export const previousWeek = (start: string) => addDays(weekStart(start), -7);
export const nextWeek = (start: string) => addDays(weekStart(start), 7);

/** Change versus the week before. `pct` is null when there was nothing to compare with. */
export function deltaVs(current: number, previous: number): { diff: number; pct: number | null; direction: "up" | "down" | "same" } {
  const diff = current - previous;
  return { diff, pct: previous === 0 ? null : Math.round((diff / previous) * 100), direction: diff > 0 ? "up" : diff < 0 ? "down" : "same" };
}

/** Whether `key` falls on a worked day of the week starting at `start`. */
export function isWorkDay(key: string, start: string): boolean {
  return weekRange(start).workDays.includes(key);
}
