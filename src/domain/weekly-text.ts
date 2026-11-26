import { isoWeek } from "./week";

/** What the share dialog and the public page need to describe a week in words. */
export interface WeeklySummary {
  /** Saturday of the week, "YYYY-MM-DD". */
  start: string;
  /** Thursday, "YYYY-MM-DD". */
  end: string;
  /** Tasks ABG moved to Completed. */
  completed: number;
  /** Tasks Vendoor confirmed Done. */
  verified: number;
  releases: Array<{ number: string; taskCount: number }>;
  cameBackBroken: Array<{ key: string; title: string; times: number }>;
  waitingCheck: string[];
  asks: Array<{ key: string; title: string }>;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const md = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${Number(key.slice(8, 10))}`;

/** "Nov 21 – 26" when both days are in one month, otherwise "Nov 28 – Dec 3". */
export function weekRangeLabel(start: string, end: string): string {
  return start.slice(0, 7) === end.slice(0, 7) ? `${md(start)} – ${Number(end.slice(8, 10))}` : `${md(start)} – ${md(end)}`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Plain text for pasting into the WhatsApp group (Figma 8.2). Built only from task activity, nothing typed by hand. */
export function weeklyText(s: WeeklySummary): string {
  const lines: string[] = [];
  lines.push(`Weekly report · ${weekRangeLabel(s.start, s.end)}`);
  const released = s.releases.length ? `, ${plural(s.releases.length, "release", "releases")}${s.releases.length === 1 ? ` (${s.releases[0].number})` : ""}` : ", no release";
  lines.push(`ABG completed ${plural(s.completed, "task", "tasks")}${released}.`);
  lines.push(`We verified ${s.verified}${s.cameBackBroken.length ? `. ${s.cameBackBroken.length} came back broken.` : "."}`);
  if (s.cameBackBroken.length) {
    lines.push("", "Came back broken");
    for (const t of s.cameBackBroken) lines.push(`${t.key} ${t.title}${t.times > 1 ? ` (${ordinal(t.times)} time)` : ""}`);
  }
  if (s.waitingCheck.length) lines.push("", "Waiting for your check", s.waitingCheck.join(" · "));
  if (s.asks.length) {
    lines.push("", "Our asks");
    s.asks.forEach((a, i) => lines.push(`${i + 1}. ${a.title} (${a.key})`));
  }
  return lines.join("\n");
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

export const weekTitle = (start: string) => `Week ${isoWeek(start)}`;
