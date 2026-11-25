/** Formatting for Reports numbers. Pure so it can be tested. */
export function formatMinutes(min: number | null): string {
  if (min === null) return "—";
  if (min < 60) return `${Math.round(min)} min`;
  return `${+(min / 60).toFixed(1)} h`;
}

export function formatDays(days: number | null): string {
  return days === null ? "—" : `${+days.toFixed(1)} days`;
}

/** "+12%" / "−6%" / "same"; null when there is nothing to compare with. */
export function formatDelta(current: number | null, previous: number | null): { text: string; direction: "up" | "down" | "same" } | null {
  if (current === null || previous === null) return null;
  if (previous === 0) return current === 0 ? { text: "same", direction: "same" } : null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { text: "same", direction: "same" };
  return { text: `${pct > 0 ? "+" : "−"}${Math.abs(pct)}%`, direction: pct > 0 ? "up" : "down" };
}

/** For counts, the raw difference reads better than a percent when numbers are small ("+1 vs Oct"). */
export function formatCountDelta(current: number, previous: number): { text: string; direction: "up" | "down" | "same" } {
  const diff = current - previous;
  return { text: diff === 0 ? "same" : `${diff > 0 ? "+" : "−"}${Math.abs(diff)}`, direction: diff > 0 ? "up" : diff < 0 ? "down" : "same" };
}
