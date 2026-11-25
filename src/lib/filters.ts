import { PRIORITIES, TASK_STATUSES, TASK_TYPES, type Priority, type TaskStatus, type TaskType } from "@/domain/types";

/** Task list filters + display options, stored in the URL so views are shareable by link (FR-5.3, 5.4). */
export interface TaskFilters {
  project: string[];
  status: TaskStatus[];
  type: TaskType[];
  priority: Priority[];
  assignee: string[]; // member id or "none" or "me"
  requester: string[]; // member id or "me"
  waiting: Array<"abg" | "vendoor">;
  due: "" | "overdue" | "week" | "today";
  created: "" | "7d" | "30d" | "90d";
  hasOccurrences: boolean;
  unverified: boolean;
  q: string;
}

export interface TaskDisplay {
  view: "list" | "board";
  group: "status" | "project" | "priority" | "assignee" | "waiting" | "none";
  order: "priority" | "due" | "updated" | "created";
  showClosed: boolean;
  showSubtasks: boolean;
  props: string[]; // visible properties
}

export const ALL_PROPS = ["project", "priority", "waiting", "assignee", "requester", "due", "updated", "type"] as const;

export const DEFAULT_FILTERS: TaskFilters = {
  project: [],
  status: [],
  type: [],
  priority: [],
  assignee: [],
  requester: [],
  waiting: [],
  due: "",
  created: "",
  hasOccurrences: false,
  unverified: false,
  q: "",
};

export const DEFAULT_DISPLAY: TaskDisplay = {
  view: "list",
  group: "status",
  order: "priority",
  showClosed: false,
  showSubtasks: true,
  props: ["project", "priority", "waiting", "assignee", "due"],
};

function list<T extends string>(v: string | null, allowed?: readonly T[]): T[] {
  if (!v) return [];
  const parts = v.split(",").map((s) => s.trim()).filter(Boolean);
  return (allowed ? parts.filter((p) => (allowed as readonly string[]).includes(p)) : parts) as T[];
}

export function parseFilters(sp: URLSearchParams): { filters: TaskFilters; display: TaskDisplay } {
  const filters: TaskFilters = {
    project: list(sp.get("project")),
    status: list(sp.get("status"), TASK_STATUSES),
    type: list(sp.get("type"), TASK_TYPES),
    priority: list(sp.get("priority"), PRIORITIES),
    assignee: list(sp.get("assignee")),
    requester: list(sp.get("requester")),
    waiting: list(sp.get("waiting"), ["abg", "vendoor"] as const),
    due: (["overdue", "week", "today"] as const).find((d) => d === sp.get("due")) ?? "",
    created: (["7d", "30d", "90d"] as const).find((d) => d === sp.get("created")) ?? "",
    hasOccurrences: sp.get("occ") === "1",
    unverified: sp.get("unverified") === "1",
    q: sp.get("q") ?? "",
  };
  const display: TaskDisplay = {
    view: sp.get("view") === "board" ? "board" : "list",
    group: (["status", "project", "priority", "assignee", "waiting", "none"] as const).find((g) => g === sp.get("group")) ?? DEFAULT_DISPLAY.group,
    order: (["priority", "due", "updated", "created"] as const).find((o) => o === sp.get("order")) ?? DEFAULT_DISPLAY.order,
    showClosed: sp.get("closed") === "1",
    showSubtasks: sp.get("subtasks") !== "0",
    props: sp.has("props") ? list(sp.get("props"), ALL_PROPS) : DEFAULT_DISPLAY.props,
  };
  return { filters, display };
}

export function serializeFilters(filters: Partial<TaskFilters>, display: Partial<TaskDisplay> = {}): string {
  const sp = new URLSearchParams();
  const f = { ...DEFAULT_FILTERS, ...filters };
  const d = { ...DEFAULT_DISPLAY, ...display };
  const setList = (k: string, v: string[]) => v.length && sp.set(k, v.join(","));
  setList("project", f.project);
  setList("status", f.status);
  setList("type", f.type);
  setList("priority", f.priority);
  setList("assignee", f.assignee);
  setList("requester", f.requester);
  setList("waiting", f.waiting);
  if (f.due) sp.set("due", f.due);
  if (f.created) sp.set("created", f.created);
  if (f.hasOccurrences) sp.set("occ", "1");
  if (f.unverified) sp.set("unverified", "1");
  if (f.q) sp.set("q", f.q);
  if (d.view !== DEFAULT_DISPLAY.view) sp.set("view", d.view);
  if (d.group !== DEFAULT_DISPLAY.group) sp.set("group", d.group);
  if (d.order !== DEFAULT_DISPLAY.order) sp.set("order", d.order);
  if (d.showClosed) sp.set("closed", "1");
  if (!d.showSubtasks) sp.set("subtasks", "0");
  if (d.props.join(",") !== DEFAULT_DISPLAY.props.join(",")) sp.set("props", d.props.join(","));
  return sp.toString();
}

/** FR-5.5 default views. */
export const DEFAULT_VIEWS: Array<{ id: string; query: string }> = [
  { id: "all_open", query: "" },
  { id: "waiting_vendoor", query: "waiting=vendoor" },
  { id: "waiting_abg", query: "waiting=abg" },
  { id: "overdue", query: "due=overdue" },
  { id: "highest_high", query: "priority=highest,high" },
  { id: "bugs", query: "type=bug" },
  { id: "unverified", query: "status=shipped&group=none&order=updated" },
  { id: "done_week", query: "status=done&closed=1&created=&order=updated" },
];

// ───────────── quick filters (Figma 3.1: All open / Needs me / Due this week / Overdue) ─────────────

export const QUICK_FILTERS = ["all", "needs_me", "due_week", "overdue"] as const;
export type QuickFilter = (typeof QUICK_FILTERS)[number];

/** The filter values a quick pill applies. Applying one replaces the other quick-filter fields, never the project or search. */
export function quickPatch(id: QuickFilter, side: "abg" | "vendoor"): Partial<TaskFilters> {
  const cleared: Partial<TaskFilters> = { waiting: [], due: "" };
  switch (id) {
    case "all":
      return cleared;
    case "needs_me":
      return { ...cleared, waiting: [side] };
    case "due_week":
      return { ...cleared, due: "week" };
    case "overdue":
      return { ...cleared, due: "overdue" };
  }
}

/** Which pill is lit for the current filters, or null when the filters are something custom. */
export function activeQuick(f: Pick<TaskFilters, "waiting" | "due">, side: "abg" | "vendoor"): QuickFilter | null {
  if (!f.waiting.length && !f.due) return "all";
  if (f.waiting.length === 1 && f.waiting[0] === side && !f.due) return "needs_me";
  if (!f.waiting.length && f.due === "week") return "due_week";
  if (!f.waiting.length && f.due === "overdue") return "overdue";
  return null;
}
