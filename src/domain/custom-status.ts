import { STATUS_GROUPS, statusGroup, type StatusGroup } from "./status-display";
import type { TaskStatus } from "./types";

/** Steps that can hold custom statuses. Done is locked: only Vendoor can move a task there, so it stays a single status. */
export const CUSTOM_GROUPS: StatusGroup[] = ["request", "processing", "stuck", "completed"];

/** The eight colours offered in the picker (Figma 5.1). */
export const STATUS_COLORS = ["#8b5cf6", "#7a8090", "#f59e0b", "#e5484d", "#2563eb", "#16a06a", "#ec4899", "#0f766e"] as const;

export const NAME_MAX = 24;

export interface CustomStatusLite {
  id: string;
  stepGroup: string;
  name: string;
  color: string;
}

export type NameProblem = "empty" | "too_long" | "duplicate" | null;

/** A name must be 1 to 24 characters and unique inside its step (ignoring case and spaces at the ends). */
export function checkName(name: string, stepGroup: string, existing: Array<Pick<CustomStatusLite, "id" | "stepGroup" | "name">>, selfId?: string): NameProblem {
  const n = name.trim();
  if (!n) return "empty";
  if (n.length > NAME_MAX) return "too_long";
  return existing.some((e) => e.id !== selfId && e.stepGroup === stepGroup && e.name.trim().toLowerCase() === n.toLowerCase()) ? "duplicate" : null;
}

/** Whether a custom status can stay on a task after it moves to `status`: only inside its own step. */
export function stillValid(custom: Pick<CustomStatusLite, "stepGroup"> | null | undefined, status: TaskStatus): boolean {
  return !!custom && statusGroup(status) === custom.stepGroup;
}

export const isStatusColor = (c: string) => (STATUS_COLORS as readonly string[]).includes(c);
export const isCustomGroup = (g: string): g is StatusGroup => (CUSTOM_GROUPS as string[]).includes(g) && (STATUS_GROUPS as readonly string[]).includes(g);

/** Soft background and dark text for a custom colour, built from the colour itself so any palette entry reads well. */
export function tintFor(hex: string): { bg: string; fg: string; dot: string } {
  return { bg: `${hex}22`, fg: `color-mix(in srgb, ${hex} 55%, #111318)`, dot: hex };
}
