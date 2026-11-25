import type { StatusGroup } from "./status-display";

/**
 * The move rules shown on Settings > Workflow. They describe what `workflow.ts` and `policy.ts` already enforce,
 * so this list is documentation for people, not a second source of truth. `tests/unit/workflow-rules.test.ts`
 * checks each row against the real rules.
 */
export interface MoveRule {
  id: "accept" | "stuck" | "complete" | "verify" | "reopen";
  from: StatusGroup;
  to: StatusGroup;
  side: "abg" | "vendoor";
}

export const MOVE_RULES: MoveRule[] = [
  { id: "accept", from: "request", to: "processing", side: "abg" },
  { id: "stuck", from: "processing", to: "stuck", side: "abg" },
  { id: "complete", from: "processing", to: "completed", side: "abg" },
  { id: "verify", from: "completed", to: "done", side: "vendoor" },
  { id: "reopen", from: "completed", to: "processing", side: "vendoor" },
];
