// Plain string unions mirroring the Prisma enums so domain code stays isomorphic (no Prisma import on the client).

export const ROLES = ["owner", "admin", "requester", "abg_lead", "abg_member"] as const;
export type Role = (typeof ROLES)[number];

export const TASK_STATUSES = [
  "triage",
  "needs_info",
  "planned",
  "in_progress",
  "shipped",
  "reopened",
  "done",
  "closed",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ["urgent", "high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const TASK_TYPES = ["bug", "change", "feature", "question", "ops"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const CLOSE_REASONS = ["duplicate", "wont_do", "canceled"] as const;
export type CloseReason = (typeof CLOSE_REASONS)[number];

export type Side = "vendoor" | "abg";

export function sideOf(role: Role): Side {
  return role === "abg_lead" || role === "abg_member" ? "abg" : "vendoor";
}

export function isVendoor(role: Role): boolean {
  return sideOf(role) === "vendoor";
}

export function isAbg(role: Role): boolean {
  return sideOf(role) === "abg";
}
