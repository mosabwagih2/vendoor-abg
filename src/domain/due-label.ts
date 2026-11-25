/** Short due-date label used on the dashboard: "Late 1d", "Today", "Tomorrow", or the date. Calendar days in the given timezone. */
export type DueLabel = { kind: "late"; days: number } | { kind: "today" } | { kind: "tomorrow" } | { kind: "date"; at: Date };

const dayNumber = (d: Date, tz: string) => {
  const [y, m, day] = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d).split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, day) / 86_400_000);
};

export function dueLabel(due: Date, now: Date, tz = "Africa/Cairo"): DueLabel {
  const diff = dayNumber(due, tz) - dayNumber(now, tz);
  if (diff < 0) return { kind: "late", days: -diff };
  if (diff === 0) return { kind: "today" };
  if (diff === 1) return { kind: "tomorrow" };
  return { kind: "date", at: due };
}
