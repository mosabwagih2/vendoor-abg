import { describe, expect, it } from "vitest";
import { checkAction, type Actor, type TaskCtx } from "@/domain/policy";
import { MOVE_RULES } from "@/domain/workflow-rules";
import { statusGroup } from "@/domain/status-display";
import type { WorkflowAction } from "@/domain/workflow";
import type { TaskStatus } from "@/domain/types";

// The Workflow settings page lists these rules for people to read. This test keeps the list honest against the real rules.
const REAL: Record<(typeof MOVE_RULES)[number]["id"], { action: WorkflowAction; from: TaskStatus }> = {
  accept: { action: "accept", from: "triage" },
  stuck: { action: "ask_info", from: "in_progress" },
  complete: { action: "ship", from: "in_progress" },
  verify: { action: "verify", from: "shipped" },
  reopen: { action: "reopen", from: "shipped" },
};

const abg: Actor = { id: "a", role: "abg_lead" };
const requester: Actor = { id: "r", role: "requester" };
const task = (status: TaskStatus): TaskCtx => ({ status, requesterId: "r", assigneeId: "a" });

describe("workflow rules shown in settings", () => {
  for (const rule of MOVE_RULES) {
    const { action, from } = REAL[rule.id];
    it(`${rule.id}: starts in ${rule.from} and only ${rule.side} can do it`, () => {
      expect(statusGroup(from)).toBe(rule.from);
      const allowed = rule.side === "abg" ? abg : requester;
      const denied = rule.side === "abg" ? requester : abg;
      expect(checkAction(allowed, action, task(from)).ok).toBe(true);
      expect(checkAction(denied, action, task(from)).ok).toBe(false);
    });
  }
});
