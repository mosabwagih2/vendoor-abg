import "server-only";
import { localDateKey } from "@/domain/sla";

/** The instant a local calendar day starts in the given timezone (Cairo is UTC+2 or +3, so we search the possible offsets). */
export function startOfLocalDay(key: string, tz: string): Date {
  const guess = new Date(`${key}T00:00:00Z`);
  for (const hours of [0, -1, -2, -3, -4]) {
    const d = new Date(guess.getTime() + hours * 3_600_000);
    if (localDateKey(d, tz) === key && localDateKey(new Date(d.getTime() - 1), tz) !== key) return d;
  }
  return guess;
}
