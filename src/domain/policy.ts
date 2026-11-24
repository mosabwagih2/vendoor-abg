import { isAbg, isVendoor, type Role, type TaskStatus } from "./types";
import { canTransitionFrom, type WorkflowAction } from "./workflow";

/** PRD 3.3 permission matrix. Enforced on the server for every action; the UI uses the same function to hide what is not allowed. */
export interface Actor {
  id: string;
  role: Role;
}

export interface TaskCtx {
  status: TaskStatus;
  requesterId: string;
  assigneeId: string | null;
}

export type Permission =
  | "view"
  | "create_request"
  | "triage"
  | "set_priority"
  | "suggest_priority"
  | "set_assignee"
  | "set_due"
  | "edit_task"
  | "edit_decision"
  | "comment"
  | "comment_internal"
  | "add_occurrence"
  | "manage_relations"
  | "manage_subtasks"
  | "record_release"
  | "propose_cancel"
  | "manage_members"
  | "manage_abg_members"
  | "manage_projects"
  | "manage_sla"
  | "view_credentials"
  | "add_credentials"
  | "bulk_edit"
  | "export";

export function can(actor: Actor, perm: Permission, task?: TaskCtx): boolean {
  const r = actor.role;
  const ownRequest = !!task && task.requesterId === actor.id;
  switch (perm) {
    case "view":
    case "create_request":
    case "comment":
    case "add_occurrence":
    case "view_credentials":
    case "add_credentials":
    case "export":
      return true;
    case "triage":
      return isAbg(r);
    case "set_priority":
      return r !== "requester";
    case "suggest_priority":
      return true;
    case "set_assignee":
    case "set_due":
      return isAbg(r);
    case "edit_task":
      return isAbg(r) || r === "owner" || r === "admin" || ownRequest;
    case "edit_decision":
      return isAbg(r) || r === "owner" || r === "admin" || ownRequest;
    case "comment_internal":
      return isAbg(r);
    case "manage_relations":
    case "manage_subtasks":
      return isAbg(r) || r === "owner" || r === "admin" || ownRequest;
    case "record_release":
      return isAbg(r);
    case "propose_cancel":
      return r === "abg_lead";
    case "manage_members":
      return r === "owner" || r === "admin";
    case "manage_abg_members":
      return r === "owner" || r === "admin" || r === "abg_lead";
    case "manage_projects":
    case "manage_sla":
      return r === "owner" || r === "admin";
    case "bulk_edit":
      return isAbg(r);
  }
}

/** Can this actor assign the task to `assigneeId`? ABG Member may only assign themself (PRD 3.3 "Yes (self)"). */
export function canAssign(actor: Actor, assigneeId: string | null): boolean {
  if (actor.role === "abg_lead") return true;
  if (actor.role === "abg_member") return assigneeId === actor.id;
  return false;
}

/** Who may perform a workflow action, before the status check. */
export function canPerform(actor: Actor, action: WorkflowAction, task: TaskCtx): boolean {
  const r = actor.role;
  const ownRequest = task.requesterId === actor.id;
  switch (action) {
    case "accept":
    case "decline":
    case "merge":
    case "ask_info":
    case "start":
    case "ship":
      return isAbg(r);
    case "answer":
      return isVendoor(r);
    case "verify":
    case "reopen":
      // Only the Vendoor side confirms. Admin and Owner can verify on behalf of any requester.
      return r === "owner" || r === "admin" || (r === "requester" && ownRequest);
    case "cancel":
      return r === "owner" || r === "admin" || (r === "requester" && ownRequest);
  }
}

export type DenyReason = "forbidden" | "invalid_status";

export function checkAction(actor: Actor, action: WorkflowAction, task: TaskCtx): { ok: true } | { ok: false; reason: DenyReason } {
  if (!canPerform(actor, action, task)) return { ok: false, reason: "forbidden" };
  if (!canTransitionFrom(action, task.status)) return { ok: false, reason: "invalid_status" };
  return { ok: true };
}
