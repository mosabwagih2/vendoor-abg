import { describe, expect, it } from "vitest";
import { can, canAssign, checkAction, type Actor, type TaskCtx } from "@/domain/policy";
import { ROLES, TASK_STATUSES, type Role } from "@/domain/types";
import { WORKFLOW_ACTIONS } from "@/domain/workflow";

const actor = (role: Role, id = "me"): Actor => ({ id, role });
const task = (status: TaskCtx["status"], requesterId = "req", assigneeId: string | null = null): TaskCtx => ({ status, requesterId, assigneeId });

describe("PRD 3.3 permission matrix", () => {
  const matrix: Array<[string, Record<Role, boolean>, (a: Actor) => boolean]> = [
    ["view", { owner: true, admin: true, requester: true, abg_lead: true, abg_member: true }, (a) => can(a, "view")],
    ["create request", { owner: true, admin: true, requester: true, abg_lead: true, abg_member: true }, (a) => can(a, "create_request")],
    ["triage", { owner: false, admin: false, requester: false, abg_lead: true, abg_member: true }, (a) => can(a, "triage")],
    ["set priority", { owner: true, admin: true, requester: false, abg_lead: true, abg_member: true }, (a) => can(a, "set_priority")],
    ["set assignee/due", { owner: false, admin: false, requester: false, abg_lead: true, abg_member: true }, (a) => can(a, "set_due")],
    ["record release", { owner: false, admin: false, requester: false, abg_lead: true, abg_member: true }, (a) => can(a, "record_release")],
    ["propose cancel", { owner: false, admin: false, requester: false, abg_lead: true, abg_member: false }, (a) => can(a, "propose_cancel")],
    ["manage members", { owner: true, admin: true, requester: false, abg_lead: false, abg_member: false }, (a) => can(a, "manage_members")],
    ["manage ABG members", { owner: true, admin: true, requester: false, abg_lead: true, abg_member: false }, (a) => can(a, "manage_abg_members")],
    ["manage projects/SLA", { owner: true, admin: true, requester: false, abg_lead: false, abg_member: false }, (a) => can(a, "manage_sla")],
    ["internal notes", { owner: false, admin: false, requester: false, abg_lead: true, abg_member: true }, (a) => can(a, "comment_internal")],
  ];
  for (const [name, expected, check] of matrix) {
    for (const role of ROLES) {
      it(`${name}: ${role} → ${expected[role]}`, () => expect(check(actor(role))).toBe(expected[role]));
    }
  }

  it("ABG member may assign only themself; lead anyone; Vendoor nobody", () => {
    expect(canAssign(actor("abg_member", "m1"), "m1")).toBe(true);
    expect(canAssign(actor("abg_member", "m1"), "m2")).toBe(false);
    expect(canAssign(actor("abg_lead", "l1"), "m2")).toBe(true);
    expect(canAssign(actor("admin"), "m2")).toBe(false);
  });
});

describe("workflow actions per role (server-side rule 1: only Vendoor verifies)", () => {
  it("only Vendoor can move Shipped → Done or Reopened", () => {
    for (const role of ROLES) {
      for (const action of ["verify", "reopen"] as const) {
        const own = checkAction(actor(role, "req"), action, task("shipped", "req"));
        const expectedOwn = role === "owner" || role === "admin" || role === "requester";
        expect(own.ok, `${role} ${action} own`).toBe(expectedOwn);
      }
    }
  });

  it("requester cannot verify someone else's request; Admin and Owner can", () => {
    expect(checkAction(actor("requester", "x"), "verify", task("shipped", "req")).ok).toBe(false);
    expect(checkAction(actor("admin", "x"), "verify", task("shipped", "req")).ok).toBe(true);
    expect(checkAction(actor("owner", "x"), "verify", task("shipped", "req")).ok).toBe(true);
  });

  it("ABG cannot verify, even its own assigned task", () => {
    const r = checkAction(actor("abg_lead", "a"), "verify", task("shipped", "req", "a"));
    expect(r).toEqual({ ok: false, reason: "forbidden" });
  });

  it("Vendoor cannot accept, start or ship", () => {
    for (const role of ["owner", "admin", "requester"] as const) {
      expect(checkAction(actor(role, "req"), "accept", task("triage")).ok).toBe(false);
      expect(checkAction(actor(role, "req"), "start", task("planned")).ok).toBe(false);
      expect(checkAction(actor(role, "req"), "ship", task("in_progress")).ok).toBe(false);
    }
  });

  it("ABG cannot answer Needs info; Vendoor can", () => {
    expect(checkAction(actor("abg_member"), "answer", task("needs_info")).ok).toBe(false);
    expect(checkAction(actor("requester", "other"), "answer", task("needs_info")).ok).toBe(true);
  });

  it("invalid status is reported separately from forbidden", () => {
    expect(checkAction(actor("admin"), "verify", task("in_progress"))).toEqual({ ok: false, reason: "invalid_status" });
  });

  it("no action is allowed from Done or Closed", () => {
    for (const role of ROLES)
      for (const action of WORKFLOW_ACTIONS)
        for (const s of ["done", "closed"] as const) expect(checkAction(actor(role, "req"), action, task(s, "req")).ok).toBe(false);
  });

  it("every status has a defined outcome for every role and action (no throws)", () => {
    for (const role of ROLES) for (const action of WORKFLOW_ACTIONS) for (const s of TASK_STATUSES) checkAction(actor(role), action, task(s));
  });
});
