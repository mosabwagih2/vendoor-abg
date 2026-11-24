import { TZDate } from "@date-fns/tz";
import { format, formatDistanceStrict } from "date-fns";

export const TZ = "Africa/Cairo";

const toTz = (d: Date | string) => new TZDate(new Date(d).getTime(), TZ);

/** Absolute due date, e.g. "Thu 26 Nov" (PRD 9.5.7). Adds the year when it differs. */
export function formatDue(d: Date | string, now = new Date()): string {
  const z = toTz(d);
  return format(z, z.getFullYear() === toTz(now).getFullYear() ? "EEE d MMM" : "EEE d MMM yyyy");
}

/** Exact Cairo time for tooltips. */
export function formatExact(d: Date | string): string {
  return format(toTz(d), "EEE d MMM yyyy, HH:mm") + " Cairo";
}

export function formatDateTime(d: Date | string): string {
  return format(toTz(d), "d MMM, HH:mm");
}

/** "2 days" / "3 hours" (no suffix). */
export function distance(d: Date | string, now = new Date()): string {
  return formatDistanceStrict(new Date(d), now);
}

export function relative(d: Date | string, now = new Date()): string {
  const date = new Date(d);
  const diff = date.getTime() - now.getTime();
  if (Math.abs(diff) < 45_000) return "just now";
  const v = formatDistanceStrict(date, now);
  return diff < 0 ? `${v} ago` : `in ${v}`;
}

/** YYYY-MM-DD in Cairo. */
export function dateKey(d: Date | string): string {
  return format(toTz(d), "yyyy-MM-dd");
}

export function greetingKey(now = new Date()): "morning" | "afternoon" | "evening" {
  const h = toTz(now).getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

export function initials(name: string): string {
  return name
    .replace(/^Eng\.\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
