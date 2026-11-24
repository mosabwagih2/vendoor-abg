import type { CloseReason, Side, TaskStatus } from "./types";

/** PRD 4.2: who must act next for each status. */
export function waitingOn(status: TaskStatus): Side | null {
  switch (status) {
    case "triage":
    case "planned":
    case "in_progress":
    case "reopened":
      return "abg";
    case "needs_info":
    case "shipped":
      return "vendoor";
    case "done":
    case "closed":
      return null;
  }
}

export const STATUS_CATEGORY: Record<TaskStatus, "new" | "blocked" | "unstarted" | "started" | "verify" | "completed" | "canceled"> = {
  triage: "new",
  needs_info: "blocked",
  planned: "unstarted",
  in_progress: "started",
  shipped: "verify",
  reopened: "started",
  done: "completed",
  closed: "canceled",
};

export const OPEN_STATUSES: TaskStatus[] = ["triage", "needs_info", "planned", "in_progress", "shipped", "reopened"];
export const ABG_STATUSES: TaskStatus[] = ["triage", "planned", "in_progress", "reopened"];

export function isOpen(status: TaskStatus): boolean {
  return status !== "done" && status !== "closed";
}

/** Statuses during which the SLA clock does not count against ABG. */
export const SLA_PAUSE_STATUSES: TaskStatus[] = ["needs_info", "shipped"];

export const WORKFLOW_ACTIONS = [
  "accept",
  "ask_info",
  "answer",
  "decline",
  "merge",
  "start",
  "ship",
  "verify",
  "reopen",
  "cancel",
] as const;
export type WorkflowAction = (typeof WORKFLOW_ACTIONS)[number];

export interface Transition {
  from: TaskStatus[];
  /** Fixed target, or "previous" to return to the status saved before Needs info. */
  to: TaskStatus | "previous";
  closeReason?: CloseReason;
  /** Input the server requires. */
  requires: Array<"comment" | "reason" | "priority" | "assignee" | "target">;
}

export const TRANSITIONS: Record<WorkflowAction, Transition> = {
  accept: { from: ["triage"], to: "planned", requires: ["priority", "assignee"] },
  ask_info: { from: ["triage", "planned", "in_progress", "reopened"], to: "needs_info", requires: ["comment"] },
  answer: { from: ["needs_info"], to: "previous", requires: ["comment"] },
  decline: { from: ["triage"], to: "closed", closeReason: "wont_do", requires: ["reason"] },
  merge: { from: ["triage"], to: "closed", closeReason: "duplicate", requires: ["target"] },
  start: { from: ["planned", "reopened"], to: "in_progress", requires: [] },
  ship: { from: ["in_progress"], to: "shipped", requires: [] },
  verify: { from: ["shipped"], to: "done", requires: [] },
  reopen: { from: ["shipped"], to: "reopened", requires: ["comment"] },
  cancel: {
    from: ["triage", "needs_info", "planned", "in_progress", "shipped", "reopened"],
    to: "closed",
    closeReason: "canceled",
    requires: ["reason"],
  },
};

export function canTransitionFrom(action: WorkflowAction, status: TaskStatus): boolean {
  return TRANSITIONS[action].from.includes(status);
}

export function resolveTarget(action: WorkflowAction, previousStatus: TaskStatus | null): TaskStatus {
  const t = TRANSITIONS[action].to;
  if (t === "previous") return previousStatus && previousStatus !== "needs_info" ? previousStatus : "triage";
  return t;
}

/** Board drop: which action moves a card from one column to another, if any. */
export function actionForMove(from: TaskStatus, to: TaskStatus): WorkflowAction | null {
  const candidates = (Object.keys(TRANSITIONS) as WorkflowAction[]).filter(
    (a) => TRANSITIONS[a].from.includes(from) && (TRANSITIONS[a].to === to || (TRANSITIONS[a].to === "previous" && to !== "needs_info")),
  );
  // Prefer the action without a fixed closeReason when the target is not Closed.
  return candidates[0] ?? null;
}
