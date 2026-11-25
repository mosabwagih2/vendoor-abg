import type { Side } from "./types";

/**
 * The one-line deployment status shown on a task (Figma 1.3 "Live on the server").
 * A release IS the deployment event, so there is no separate deploy field on the task.
 */
export interface ReleaseInfo {
  number: string;
  state: "upcoming" | "released" | "rolled_back";
  releasedAt: string | null;
  deployedBy: string | null;
  rollbackReason: string | null;
}

export type ReleaseLine =
  | { kind: "none" }
  | { kind: "draft"; number: string }
  | { kind: "live"; number: string; at: string | null; by: string | null }
  | { kind: "rolled_back"; number: string; reason: string | null };

export function releaseLine(release: ReleaseInfo | null): ReleaseLine {
  if (!release) return { kind: "none" };
  if (release.state === "released") return { kind: "live", number: release.number, at: release.releasedAt, by: release.deployedBy };
  if (release.state === "rolled_back") return { kind: "rolled_back", number: release.number, reason: release.rollbackReason };
  return { kind: "draft", number: release.number };
}

/** Vendoor can only test once the change is live. ABG sees the line in every state. */
export function showReleaseLine(line: ReleaseLine, side: Side): boolean {
  if (side === "abg") return true;
  return line.kind !== "none" && line.kind !== "draft";
}
