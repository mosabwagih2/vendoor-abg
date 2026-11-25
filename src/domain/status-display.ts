import type { TaskStatus } from "./types";

/** The five statuses people see (Figma). The workflow keeps finer internal statuses; this folds them for display, grouping and the board. */
export const STATUS_GROUPS = ["request", "processing", "stuck", "completed", "done"] as const;
export type StatusGroup = (typeof STATUS_GROUPS)[number];

const GROUP_OF: Record<TaskStatus, StatusGroup | null> = {
  triage: "request",
  planned: "processing",
  in_progress: "processing",
  reopened: "processing",
  needs_info: "stuck",
  shipped: "completed",
  done: "done",
  closed: null,
};

export function statusGroup(s: TaskStatus): StatusGroup | null {
  return GROUP_OF[s];
}

export const GROUP_MEMBERS: Record<StatusGroup, TaskStatus[]> = {
  request: ["triage"],
  processing: ["planned", "in_progress", "reopened"],
  stuck: ["needs_info"],
  completed: ["shipped"],
  done: ["done"],
};
