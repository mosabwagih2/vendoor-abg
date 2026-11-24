import { TZDate } from "@date-fns/tz";

/**
 * Working-time calendar and SLA maths (PRD 4.3, 8).
 * Pure functions, no database. All instants are absolute Dates; local wall-clock maths happens in the calendar timezone
 * (Africa/Cairo by default) so DST is handled by the IANA rules, never by fixed offsets.
 */

export interface WorkSeasonDef {
  start: string; // YYYY-MM-DD inclusive
  end: string; // YYYY-MM-DD inclusive
  startMin: number;
  endMin: number;
}

export interface WorkCalendar {
  tz: string;
  workingDays: number[]; // 0 = Sunday
  startMin: number; // minutes after local midnight
  endMin: number;
  holidays: string[]; // YYYY-MM-DD
  seasons?: WorkSeasonDef[];
}

export interface Interval {
  start: Date;
  end: Date | null; // null = still open
}

export const DEFAULT_CALENDAR: WorkCalendar = {
  tz: "Africa/Cairo",
  workingDays: [0, 1, 2, 3, 4],
  startMin: 10 * 60,
  endMin: 18 * 60,
  holidays: [],
  seasons: [],
};

/** "1 working day" in PRD 4.3 = one full working day of the default calendar. */
export const WORKING_DAY_MINUTES = 8 * 60;

const MAX_DAYS = 3660;

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

interface LocalDay {
  y: number;
  m: number; // 0-based
  d: number;
}

function localDayOf(instant: Date, tz: string): LocalDay {
  const z = new TZDate(instant.getTime(), tz);
  return { y: z.getFullYear(), m: z.getMonth(), d: z.getDate() };
}

function dayKey(day: LocalDay): string {
  return `${day.y}-${pad(day.m + 1)}-${pad(day.d)}`;
}

function nextDay(day: LocalDay): LocalDay {
  // Date.UTC handles month/year rollover; we only use it for calendar arithmetic, not instants.
  const u = new Date(Date.UTC(day.y, day.m, day.d + 1));
  return { y: u.getUTCFullYear(), m: u.getUTCMonth(), d: u.getUTCDate() };
}

function weekday(day: LocalDay): number {
  return new Date(Date.UTC(day.y, day.m, day.d)).getUTCDay();
}

function localInstant(day: LocalDay, minutes: number, tz: string): Date {
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  return new Date(new TZDate(day.y, day.m, day.d, h, min, 0, 0, tz).getTime());
}

/** The working window of a local day, or null if it is not a working day. */
export function windowOf(cal: WorkCalendar, day: LocalDay): { start: Date; end: Date } | null {
  const key = dayKey(day);
  if (!cal.workingDays.includes(weekday(day))) return null;
  if (cal.holidays.includes(key)) return null;
  const season = cal.seasons?.find((s) => s.start <= key && key <= s.end);
  const startMin = season ? season.startMin : cal.startMin;
  const endMin = season ? season.endMin : cal.endMin;
  if (endMin <= startMin) return null;
  return { start: localInstant(day, startMin, cal.tz), end: localInstant(day, endMin, cal.tz) };
}

/** Subtract exclusion intervals from [start, end); returns the remaining sub-intervals in order. */
function subtract(start: number, end: number, exclusions: Interval[]): Array<[number, number]> {
  let parts: Array<[number, number]> = [[start, end]];
  for (const ex of exclusions) {
    const exS = ex.start.getTime();
    const exE = ex.end ? ex.end.getTime() : Number.POSITIVE_INFINITY;
    const next: Array<[number, number]> = [];
    for (const [s, e] of parts) {
      if (exE <= s || exS >= e) {
        next.push([s, e]);
        continue;
      }
      if (exS > s) next.push([s, exS]);
      if (exE < e) next.push([exE, e]);
    }
    parts = next;
  }
  return parts;
}

/**
 * The instant at which `minutes` working minutes have elapsed after `start`, skipping non-working time and `exclusions`
 * (e.g. Needs info pauses). Returns null if an open-ended exclusion means the target is never reached.
 */
export function addWorkingMinutes(cal: WorkCalendar, start: Date, minutes: number, exclusions: Interval[] = []): Date | null {
  let remaining = minutes * 60_000;
  let day = localDayOf(start, cal.tz);
  const startMs = start.getTime();
  if (remaining <= 0) return new Date(startMs);
  for (let i = 0; i < MAX_DAYS; i++) {
    const w = windowOf(cal, day);
    if (w) {
      const s = Math.max(w.start.getTime(), startMs);
      const e = w.end.getTime();
      if (s < e) {
        for (const [ps, pe] of subtract(s, e, exclusions)) {
          const avail = pe - ps;
          if (remaining <= avail) return new Date(ps + remaining);
          remaining -= avail;
        }
      }
    }
    const next = nextDay(day);
    // An open-ended exclusion that has already started swallows all later time: the target is never reached.
    const nextStart = localInstant(next, 0, cal.tz).getTime();
    if (exclusions.some((ex) => ex.end === null && ex.start.getTime() < nextStart)) return null;
    day = next;
  }
  return null;
}

/** Working minutes between two instants, excluding `exclusions`. Negative if b < a. */
export function workingMinutesBetween(cal: WorkCalendar, a: Date, b: Date, exclusions: Interval[] = []): number {
  if (b.getTime() < a.getTime()) return -workingMinutesBetween(cal, b, a, exclusions);
  let total = 0;
  let day = localDayOf(a, cal.tz);
  const endKey = dayKey(localDayOf(b, cal.tz));
  for (let i = 0; i < MAX_DAYS; i++) {
    const w = windowOf(cal, day);
    if (w) {
      const s = Math.max(w.start.getTime(), a.getTime());
      const e = Math.min(w.end.getTime(), b.getTime());
      if (s < e) for (const [ps, pe] of subtract(s, e, exclusions)) total += pe - ps;
    }
    if (dayKey(day) === endKey) break;
    day = nextDay(day);
  }
  return Math.round(total / 60_000);
}

export type SlaState = "ok" | "at_risk" | "breached" | "paused" | "met" | "none";

export interface SlaClock {
  dueAt: Date | null;
  state: SlaState;
  /** Working minutes left (negative when breached). Null when paused or no target. */
  remainingMinutes: number | null;
  targetMinutes: number | null;
}

export interface SlaInput {
  calendar: WorkCalendar;
  targetMinutes: number | null;
  clockStart: Date;
  pauses: Interval[];
  completedAt: Date | null;
  now: Date;
  atRiskPercentLeft?: number; // default 25
}

/** One SLA clock (first response or resolution). */
export function computeClock(input: SlaInput): SlaClock {
  const { calendar, targetMinutes, clockStart, pauses, completedAt, now } = input;
  const pct = input.atRiskPercentLeft ?? 25;
  if (targetMinutes == null) return { dueAt: null, state: "none", remainingMinutes: null, targetMinutes: null };

  if (completedAt) {
    const closedPauses = pauses.map((p) => ({ start: p.start, end: p.end ?? completedAt }));
    const due = addWorkingMinutes(calendar, clockStart, targetMinutes, closedPauses);
    const used = workingMinutesBetween(calendar, clockStart, completedAt, closedPauses);
    return {
      dueAt: due,
      state: used <= targetMinutes ? "met" : "breached",
      remainingMinutes: targetMinutes - used,
      targetMinutes,
    };
  }

  const openPause = pauses.find((p) => p.end === null && p.start.getTime() <= now.getTime());
  if (openPause) {
    const used = workingMinutesBetween(calendar, clockStart, now, pauses);
    return { dueAt: null, state: "paused", remainingMinutes: targetMinutes - used, targetMinutes };
  }

  const due = addWorkingMinutes(calendar, clockStart, targetMinutes, pauses);
  const used = workingMinutesBetween(calendar, clockStart, now, pauses);
  const remaining = targetMinutes - used;
  let state: SlaState = "ok";
  if (due && now.getTime() > due.getTime()) state = "breached";
  else if (remaining <= (targetMinutes * pct) / 100) state = "at_risk";
  return { dueAt: due, state, remainingMinutes: remaining, targetMinutes };
}

/** Pauses derived from status history spans: every stay in a pause status. */
export function pausesFromSpans(
  spans: Array<{ status: string; enteredAt: Date; leftAt: Date | null }>,
  pauseStatuses: readonly string[],
): Interval[] {
  return spans.filter((s) => pauseStatuses.includes(s.status)).map((s) => ({ start: s.enteredAt, end: s.leftAt }));
}

/** Calendar date (YYYY-MM-DD) of an instant in the calendar timezone. */
export function localDateKey(instant: Date, tz: string): string {
  return dayKey(localDayOf(instant, tz));
}

/** End of the working day (local end time) for a due date given as YYYY-MM-DD. Used to make a due date "overdue" after 18:00. */
export function endOfWorkingDay(cal: WorkCalendar, dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return localInstant({ y, m: m - 1, d }, cal.endMin, cal.tz);
}

/** Add N working days to an instant and return the end of that working day. */
export function addWorkingDays(cal: WorkCalendar, start: Date, days: number): Date {
  const due = addWorkingMinutes(cal, start, days * WORKING_DAY_MINUTES) ?? start;
  return due;
}
