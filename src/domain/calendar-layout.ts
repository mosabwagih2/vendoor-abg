import { addDays, weekStart } from "./week";

/** Layout maths for the Calendar view. Weeks run Saturday to Friday (Friday is the day off). Day keys are "YYYY-MM-DD". */
export interface CalItem {
  id: string;
  /** First day the bar covers, inclusive. */
  start: string;
  /** Last day the bar covers, inclusive. */
  end: string;
}

export interface CalSegment {
  id: string;
  /** 0 = Saturday … 6 = Friday. */
  col: number;
  span: number;
  /** Stack position inside the week row. */
  row: number;
  /** The bar started before this week. */
  cutLeft: boolean;
  /** The bar continues after this week. */
  cutRight: boolean;
}

export interface CalDay {
  key: string;
  inMonth: boolean;
  isDayOff: boolean;
}

/** The weeks that cover a month, from the Saturday on or before the 1st to the Friday on or after the last day. */
export function monthWeeks(anchor: string): CalDay[][] {
  const [y, m] = anchor.split("-").map(Number);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const weeks: CalDay[][] = [];
  for (let cursor = weekStart(first); cursor < nextMonth; cursor = addDays(cursor, 7)) {
    weeks.push(weekDays(cursor, (k) => k.slice(0, 7) === first.slice(0, 7)));
  }
  return weeks;
}

/** The single week that contains `anchor`. */
export function oneWeek(anchor: string): CalDay[][] {
  return [weekDays(weekStart(anchor), () => true)];
}

function weekDays(start: string, inMonth: (k: string) => boolean): CalDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(start, i);
    return { key, inMonth: inMonth(key), isDayOff: i === 6 };
  });
}

/** Clips items to one week and stacks overlapping ones into rows. Items that do not touch the week are dropped. */
export function layoutWeek(days: string[], items: CalItem[]): CalSegment[] {
  const first = days[0];
  const last = days[6];
  const segs = items
    .filter((it) => it.end >= first && it.start <= last)
    .map((it) => {
      const s = it.start < first ? first : it.start;
      const e = it.end > last ? last : it.end;
      const col = days.indexOf(s);
      return { id: it.id, col, span: days.indexOf(e) - col + 1, cutLeft: it.start < first, cutRight: it.end > last };
    })
    .sort((a, b) => a.col - b.col || b.span - a.span || a.id.localeCompare(b.id));
  const rowEnds: number[] = []; // last occupied column + 1 for each row
  return segs.map((s) => {
    let row = rowEnds.findIndex((end) => end <= s.col);
    if (row === -1) row = rowEnds.length;
    rowEnds[row] = s.col + s.span;
    return { ...s, row };
  });
}

/** Moves the visible month or week by one step. */
export function stepAnchor(anchor: string, mode: "month" | "week", delta: 1 | -1): string {
  if (mode === "week") return addDays(anchor, 7 * delta);
  const [y, m] = anchor.split("-").map(Number);
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}-01`;
}
