/** Groups drawer rows into Today / Yesterday / Earlier, by calendar day in the workspace timezone. */
export type DayBucket = "today" | "yesterday" | "earlier";

const dayKey = (d: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);

export function dayBucket(at: Date, now: Date, tz = "Africa/Cairo"): DayBucket {
  const a = dayKey(at, tz);
  if (a === dayKey(now, tz)) return "today";
  if (a === dayKey(new Date(now.getTime() - 86_400_000), tz)) return "yesterday";
  return "earlier";
}

export function groupByDay<T extends { at: string }>(items: T[], now = new Date(), tz?: string): Array<{ bucket: DayBucket; items: T[] }> {
  const out: Array<{ bucket: DayBucket; items: T[] }> = [];
  for (const bucket of ["today", "yesterday", "earlier"] as const) {
    const list = items.filter((i) => dayBucket(new Date(i.at), now, tz) === bucket);
    if (list.length) out.push({ bucket, items: list });
  }
  return out;
}
