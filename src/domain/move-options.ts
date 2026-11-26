import type { WorkflowAction } from "./workflow";
import { statusGroup, type StatusGroup } from "./status-display";
import type { TaskStatus } from "./types";

/** One row of the phone "Move task to" sheet (Figma 6.7). */
export interface MoveOption {
  group: StatusGroup;
  /** The workflow action that performs the move. */
  action: WorkflowAction | null;
  current: boolean;
}

/** Which step each action leads to. Start keeps the task in Processing, so it is not a move. */
const TARGET: Partial<Record<WorkflowAction, StatusGroup>> = {
  accept: "processing",
  answer: "processing",
  reopen: "processing",
  ask_info: "stuck",
  ship: "completed",
  verify: "done",
};

/**
 * The steps a person can move this task to right now: the current one (ticked) plus every step an allowed action leads to.
 * Built from the same allowed actions the buttons use, so the sheet never offers something the server would refuse.
 */
export function moveOptions(status: TaskStatus, allowed: WorkflowAction[]): MoveOption[] {
  const current = statusGroup(status);
  const out: MoveOption[] = current ? [{ group: current, action: null, current: true }] : [];
  for (const a of allowed) {
    const group = TARGET[a];
    if (!group || group === current || out.some((o) => o.group === group)) continue;
    out.push({ group, action: a, current: false });
  }
  return out;
}
