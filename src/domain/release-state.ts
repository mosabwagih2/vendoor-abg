import type { TaskStatus } from "./types";

/**
 * A release is the deployment event (Figma 4.4).
 *  upcoming    = Draft: planned, not on the server yet
 *  released    = Live: on the server, tasks are Completed and waiting for Vendoor
 *  rolled_back = Rolled back: taken off the server again
 */
export type ReleaseState = "upcoming" | "released" | "rolled_back";

export const RELEASE_LABEL: Record<ReleaseState, "draft" | "live" | "rolledBack"> = {
  upcoming: "draft",
  released: "live",
  rolled_back: "rolledBack",
};

/** Only a live release can be rolled back, and only by ABG (checked on the server with the record_release permission). */
export function canRollBack(state: ReleaseState): boolean {
  return state === "released";
}

/** Only a draft can be marked as deployed. */
export function canDeploy(state: ReleaseState): boolean {
  return state === "upcoming";
}

/**
 * Where a task goes when its release is rolled back.
 * Completed (waiting for Vendoor to test) goes back to Processing so ABG fixes it again.
 * Anything else is left alone: Done stays Done, Processing stays Processing.
 */
export function statusAfterRollback(status: TaskStatus): TaskStatus | null {
  return status === "shipped" ? "in_progress" : null;
}
