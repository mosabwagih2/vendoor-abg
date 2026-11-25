import { addDays, weekStart } from "./week";

/** Date ranges for the Reports page. All dates are "YYYY-MM-DD" keys in the workspace timezone; `end` is exclusive. */
export type RangeKind = "day" | "week" | "month" | "year";
export const RANGE_KINDS: RangeKind[] = ["day", "week", "month", "year"];

export interface Range {
  kind: RangeKind;
  start: string;
  end: string;
}

export interface Bucket {
  /** Short label for the chart axis. */
  label: string;
  start: string;
  end: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ymd = (y: number, m: number, d = 1) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const parts = (key: string) => key.split("-").map(Number) as [number, number, number];

export function parseRangeKind(v: string | undefined): RangeKind {
  return RANGE_KINDS.find((k) => k === v) ?? "month";
}

/** The range of the given kind that contains `anchor`. Weeks run Saturday to Friday so the Thursday-ending work week fits inside. */
export function rangeFor(kind: RangeKind, anchor: string): Range {
  const [y, m] = parts(anchor);
  switch (kind) {
    case "day":
      return { kind, start: anchor, end: addDays(anchor, 1) };
    case "week": {
      const start = weekStart(anchor);
      return { kind, start, end: addDays(start, 7) };
    }
    case "month":
      return { kind, start: ymd(y, m), end: m === 12 ? ymd(y + 1, 1) : ymd(y, m + 1) };
    case "year":
      return { kind, start: ymd(y, 1), end: ymd(y + 1, 1) };
  }
}

/** Moves a range by whole units (-1 = the one before). */
export function shiftRange(r: Range, delta: number): Range {
  const [y, m, d] = parts(r.start);
  switch (r.kind) {
    case "day":
      return rangeFor("day", addDays(r.start, delta));
    case "week":
      return rangeFor("week", addDays(r.start, 7 * delta));
    case "month": {
      const idx = y * 12 + (m - 1) + delta;
      return rangeFor("month", ymd(Math.floor(idx / 12), (idx % 12) + 1, d > 28 ? 1 : 1));
    }
    case "year":
      return rangeFor("year", ymd(y + delta, 1));
  }
}

/** Human title for the range header, e.g. "Nov 1 – Nov 30, 2026". */
export function rangeTitle(r: Range): string {
  const last = addDays(r.end, -1);
  const [y1, m1, d1] = parts(r.start);
  const [y2, m2, d2] = parts(last);
  if (r.kind === "day") return `${MONTHS[m1 - 1]} ${d1}, ${y1}`;
  if (r.kind === "year") return String(y1);
  return `${MONTHS[m1 - 1]} ${d1} – ${MONTHS[m2 - 1]} ${d2}, ${y2}`;
}

/** Short name of the range for "vs Oct 2026" labels. */
export function rangeShortName(r: Range): string {
  const [y, m, d] = parts(r.start);
  if (r.kind === "year") return String(y);
  if (r.kind === "month") return `${MONTHS[m - 1]} ${y}`;
  if (r.kind === "week") return `week of ${MONTHS[m - 1]} ${d}`;
  return `${MONTHS[m - 1]} ${d}`;
}

/** The bars of the Created vs Completed chart: hours for a day, days for a week, weeks for a month, months for a year. */
export function bucketsFor(r: Range): Bucket[] {
  if (r.kind === "day") return Array.from({ length: 24 }, (_, h) => ({ label: String(h), start: `${r.start}#${h}`, end: `${r.start}#${h + 1}` }));
  if (r.kind === "week") return Array.from({ length: 7 }, (_, i) => ({ label: ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"][i], start: addDays(r.start, i), end: addDays(r.start, i + 1) }));
  if (r.kind === "year") {
    const [y] = parts(r.start);
    return MONTHS.map((label, i) => ({ label, start: ymd(y, i + 1), end: i === 11 ? ymd(y + 1, 1) : ymd(y, i + 2) }));
  }
  // Month: Saturday-start weeks, clipped to the month.
  const out: Bucket[] = [];
  let cursor = r.start;
  while (cursor < r.end) {
    const next = addDays(weekStart(cursor), 7);
    const end = next < r.end ? next : r.end;
    out.push({ label: `W${out.length + 1}`, start: cursor, end });
    cursor = end;
  }
  return out;
}
