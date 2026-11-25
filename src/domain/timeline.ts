/** Maths for the Timeline view: day positions on a horizontal scale. Day keys are "YYYY-MM-DD". */
export type TimelineScale = "weeks" | "months" | "quarters";

/** Pixels per day for each zoom level. */
export const PX_PER_DAY: Record<TimelineScale, number> = { weeks: 28, months: 9, quarters: 3.5 };

const DAY = 86_400_000;
const ms = (key: string) => Date.parse(`${key}T00:00:00Z`);

export const daysBetween = (a: string, b: string) => Math.round((ms(b) - ms(a)) / DAY);

export interface Span {
  start: string;
  end: string;
}

/** The start and end of what the timeline shows: whole months around the data, at least `minDays` long. */
export function visibleRange(spans: Span[], today: string, minDays = 90): Span {
  const starts = [today, ...spans.map((s) => s.start)].sort();
  const ends = [today, ...spans.map((s) => s.end)].sort();
  const first = starts[0].slice(0, 7) + "-01";
  const lastDate = new Date(ms(ends[ends.length - 1]) + 7 * DAY);
  let end = new Date(Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  if (daysBetween(first, end) < minDays) end = new Date(ms(first) + minDays * DAY).toISOString().slice(0, 10);
  return { start: first, end };
}

/** Left offset and width in pixels for a bar. A bar is at least one day wide so it never disappears. */
export function barBox(range: Span, span: Span, scale: TimelineScale): { left: number; width: number } {
  const px = PX_PER_DAY[scale];
  const left = daysBetween(range.start, span.start) * px;
  const days = Math.max(1, daysBetween(span.start, span.end) + 1);
  return { left, width: days * px };
}

/** Month starts inside the range, with their offset, for the header row. */
export function monthMarks(range: Span, scale: TimelineScale): Array<{ label: string; left: number; width: number }> {
  const out: Array<{ label: string; left: number; width: number }> = [];
  const px = PX_PER_DAY[scale];
  let cursor = range.start;
  while (cursor < range.end) {
    const d = new Date(ms(cursor));
    const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
    const stop = next < range.end ? next : range.end;
    out.push({ label: new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(d), left: daysBetween(range.start, cursor) * px, width: daysBetween(cursor, stop) * px });
    cursor = stop;
  }
  return out;
}

/** Offsets of every Friday in the range (the day off), so they can be shaded. */
export function fridayOffsets(range: Span, scale: TimelineScale): number[] {
  const out: number[] = [];
  const px = PX_PER_DAY[scale];
  for (let i = 0, t = ms(range.start); t < ms(range.end); i++, t += DAY) if (new Date(t).getUTCDay() === 5) out.push(i * px);
  return out;
}
