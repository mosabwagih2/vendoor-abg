"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useVirtualizer } from "@tanstack/react-virtual";
import { DndContext, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { ChevronRight, Download, List, Columns3, Bookmark, MoreHorizontal, X, Expand, Repeat, Paperclip, Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Menu, MenuContent, MenuItem, MenuTrigger, MenuLabel } from "@/components/ui/menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusIcon } from "@/components/icons/status-icon";
import { GROUP_REPRESENTATIVE, STATUS_GROUPS, statusGroup, type StatusGroup } from "@/domain/status-display";
import { PriorityIcon } from "@/components/icons/priority-icon";
import { Avatar } from "@/components/ui/avatar";
import { DueDate, Mono } from "@/components/ui/badges";
import { TaskRow, toWorkflowTask, type TaskRowData } from "@/components/task/task-row";
import { TaskView } from "@/components/task/task-view";
import { availableActions, useWorkflow } from "@/components/task/workflow-actions";
import { useApp } from "@/components/layout/app-context";
import { cn } from "@/lib/cn";
import { DEFAULT_VIEWS, serializeFilters, type TaskDisplay, type TaskFilters } from "@/lib/filters";
import { TASK_STATUSES, PRIORITIES, type Priority, type TaskStatus } from "@/domain/types";
import { actionForGroupMove } from "@/domain/workflow";
import type { TaskDetail } from "@/server/task-detail";
import { bulkAction } from "@/server/actions/tasks";
import { deleteViewAction, saveViewAction } from "@/server/actions/misc";
import { DisplayMenu, FilterBar } from "./filter-bar";

interface Props {
  rows: TaskRowData[];
  filters: TaskFilters;
  display: TaskDisplay;
  query: string;
  savedViews: Array<{ id: string; name: string; query: string; shared: boolean; mine: boolean }>;
  peek: TaskDetail | null;
}

export function TasksView({ rows, filters, display, query, savedViews, peek }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const navigate = (f: Partial<TaskFilters>, d: Partial<TaskDisplay> = {}) => {
    const qs = serializeFilters({ ...filters, ...f }, { ...display, ...d });
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const peekHref = (key: string) => `${pathname}?${query ? query + "&" : ""}peek=${key}`;

  return (
    <div className="flex h-full flex-col max-md:h-[calc(100dvh-56px)]">
      <PageHeader title={t("tasks.title")}>
        <div role="group" aria-label={t("tasks.title")} className="inline-flex rounded-control border border-border bg-surface p-0.5">
          {(["list", "board"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={display.view === v}
              onClick={() => navigate({}, { view: v })}
              className={cn("inline-flex h-6 items-center gap-1 rounded px-2 text-meta", display.view === v ? "bg-subtle font-medium text-fg" : "text-fg-secondary")}
            >
              {v === "list" ? <List size={13} aria-hidden /> : <Columns3 size={13} aria-hidden />}
              {t(`tasks.${v}`)}
            </button>
          ))}
        </div>
        <DisplayMenu display={display} onChange={(d) => navigate({}, d)} />
        <SaveView query={query} />
        <Button asChild size="sm" variant="ghost">
          <a href={`/api/tasks/export?${query}`} download>
            <Download size={14} aria-hidden />
            <span className="max-sm:sr-only">{t("tasks.export")}</span>
          </a>
        </Button>
      </PageHeader>

      <ViewsStrip query={query} savedViews={savedViews} />
      <FilterBar filters={filters} onChange={(f) => navigate(f)} />

      {selected.size > 0 && <BulkBar ids={[...selected]} rows={rows} onDone={() => setSelected(new Set())} />}

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          {!rows.length ? (
            <EmptyState title={t("tasks.empty")}>
              <Button size="sm" onClick={() => navigate({ ...Object.fromEntries(Object.keys(filters).map((k) => [k, Array.isArray(filters[k as keyof TaskFilters]) ? [] : typeof filters[k as keyof TaskFilters] === "boolean" ? false : ""])) })}>
                {t("tasks.clearFilters")}
              </Button>
            </EmptyState>
          ) : display.view === "list" ? (
            <ListView rows={rows} display={display} selected={selected} setSelected={setSelected} peekHref={peekHref} activeKey={peek?.key} />
          ) : (
            <BoardView rows={rows} display={display} peekHref={peekHref} />
          )}
        </div>
        {peek && (
          <aside aria-label={peek.key} className="fixed inset-0 z-30 overflow-y-auto border-s border-border bg-canvas md:static md:w-[560px] md:shrink-0">
            <div className="sticky top-0 z-10 flex items-center gap-1 border-b border-border bg-canvas/95 px-3 py-1.5 backdrop-blur">
              <Mono className="text-fg-secondary">{peek.key}</Mono>
              <Button asChild size="icon" variant="ghost" className="ms-auto" aria-label={t("common.openFull")}>
                <Link href={`/tasks/${peek.key}`}>
                  <Expand size={14} aria-hidden />
                </Link>
              </Button>
              <Button size="icon" variant="ghost" aria-label={t("common.close")} onClick={() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })}>
                <X size={15} aria-hidden />
              </Button>
            </div>
            <TaskView task={peek} compact />
          </aside>
        )}
      </div>
    </div>
  );
}

// ───────────── views ─────────────

function ViewsStrip({ query, savedViews }: { query: string; savedViews: Props["savedViews"] }) {
  const t = useTranslations("tasks");
  const current = query.replace(/&?view=board/, "");
  return (
    <nav aria-label={t("views")} className="flex gap-1 overflow-x-auto border-b border-border px-4 py-1.5">
      {DEFAULT_VIEWS.map((v) => (
        <Link
          key={v.id}
          href={`/tasks${v.query ? `?${v.query}` : ""}`}
          aria-current={current === v.query ? "page" : undefined}
          className={cn("h-7 shrink-0 rounded-full px-2.5 text-meta leading-7", current === v.query ? "bg-primary font-medium text-primary-fg" : "text-fg-secondary hover:bg-subtle")}
        >
          {t(`views_default.${v.id}`)}
        </Link>
      ))}
      {savedViews.map((v) => (
        <span key={v.id} className={cn("group inline-flex h-7 shrink-0 items-center rounded-full text-meta", current === v.query ? "bg-primary text-primary-fg" : "text-fg-secondary hover:bg-subtle")}>
          <Link href={`/tasks?${v.query}`} className="inline-flex h-7 items-center gap-1 ps-2.5 pe-1">
            <Bookmark size={11} aria-hidden />
            {v.name}
          </Link>
          {v.mine && (
            <button type="button" aria-label={`Delete view ${v.name}`} onClick={() => deleteViewAction(v.id)} className="me-1 hidden h-5 w-5 items-center justify-center rounded-full hover:bg-border/60 group-hover:inline-flex">
              <Trash2 size={10} aria-hidden />
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}

function SaveView({ query }: { query: string }) {
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const { me } = useApp();
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost">
          <Bookmark size={14} aria-hidden />
          <span className="max-sm:sr-only">{t("saveView")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const r = await saveViewAction(name, query, shared);
            if (r.ok) {
              toast.success(tc("saved"));
              setName("");
            } else toast.error(tc("error"));
          }}
        >
          <label htmlFor="view-name" className="text-meta font-medium text-fg-secondary">
            {t("viewName")}
          </label>
          <Input id="view-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          {["owner", "admin", "abg_lead"].includes(me.role) && (
            <label className="flex items-center gap-2 text-ui">
              <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="h-4 w-4" />
              {t("shareView")}
            </label>
          )}
          <Button type="submit" size="sm" variant="primary" className="w-full">
            {tc("save")}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

// ───────────── grouping ─────────────

function groupRows(rows: TaskRowData[], by: TaskDisplay["group"], labels: (g: string) => string) {
  if (by === "none") return [{ id: "all", label: "", icon: null as React.ReactNode, rows }];
  const keyOf = (r: TaskRowData) =>
    by === "status" ? (statusGroup(r.status as TaskStatus) ?? "closed") : by === "project" ? r.project.key : by === "priority" ? (r.priority ?? r.suggestedPriority ?? "none") : by === "assignee" ? (r.assignee?.name ?? "") : (r.waitingOn ?? "nobody");
  const order =
    by === "status" ? [...STATUS_GROUPS, "closed"] : by === "priority" ? [...PRIORITIES, "none"] : by === "waiting" ? ["vendoor", "abg", "nobody"] : [...new Set(rows.map(keyOf))].sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));
  const groups = order.map((k) => ({
    id: k,
    label: labels(k),
    icon: by === "status" ? <StatusIcon status={k === "closed" ? "closed" : GROUP_REPRESENTATIVE[k as StatusGroup]} /> : by === "priority" ? <PriorityIcon priority={k === "none" ? null : (k as Priority)} /> : by === "assignee" ? <Avatar name={k || null} size={16} /> : null,
    rows: rows.filter((r) => keyOf(r) === k),
  }));
  return groups.filter((g) => g.rows.length);
}

function useGroupLabel(by: TaskDisplay["group"]) {
  const t = useTranslations();
  const { projects } = useApp();
  return (k: string) => {
    if (by === "status") return t(`statusGroup.${k}` as "statusGroup.request");
    if (by === "priority") return k === "none" ? t("priority.none") : t(`priority.${k}` as "priority.highest");
    if (by === "waiting") return k === "nobody" ? t("waiting.nobody") : t("waiting.label", { side: t(`waiting.${k}` as "waiting.abg") });
    if (by === "project") return projects.find((p) => p.key === k)?.name ?? k;
    if (by === "assignee") return k || t("common.unassigned");
    return k;
  };
}

// ───────────── list (virtualised: 1,000 rows render in well under 1 s) ─────────────

function ListView({
  rows,
  display,
  selected,
  setSelected,
  peekHref,
  activeKey,
}: {
  rows: TaskRowData[];
  display: TaskDisplay;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  peekHref: (k: string) => string;
  activeKey?: string;
}) {
  const t = useTranslations("tasks");
  const { me } = useApp();
  const label = useGroupLabel(display.group);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const groups = useMemo(() => groupRows(rows, display.group, label), [rows, display.group, label]);
  const flat = useMemo(() => {
    const out: Array<{ type: "group"; g: (typeof groups)[number] } | { type: "row"; r: TaskRowData }> = [];
    for (const g of groups) {
      if (display.group !== "none") out.push({ type: "group", g });
      if (!collapsed.has(g.id)) for (const r of g.rows) out.push({ type: "row", r });
    }
    return out;
  }, [groups, collapsed, display.group]);
  const parentRef = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({ count: flat.length, getScrollElement: () => parentRef.current, estimateSize: (i) => (flat[i].type === "group" ? 36 : 37), overscan: 12 });
  const canBulk = me.side === "abg" || me.role !== "requester";
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  return (
    <div ref={parentRef} className="h-full overflow-y-auto" role="region" aria-label={t("title")}>
      {canBulk && (
        <div className="flex h-8 items-center gap-2 border-b border-border px-4 text-meta text-fg-secondary">
          <input
            type="checkbox"
            className="h-4 w-4"
            aria-label={t("selectAll")}
            checked={allSelected}
            onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
          />
          <span className="tabular">{t("selected", { count: selected.size })}</span>
          <span className="tabular ms-auto">{rows.length}</span>
        </div>
      )}
      <div style={{ height: v.getTotalSize(), position: "relative" }}>
        {v.getVirtualItems().map((vi) => {
          const item = flat[vi.index];
          return (
            <div key={vi.key} data-index={vi.index} ref={v.measureElement} style={{ position: "absolute", top: 0, insetInlineStart: 0, width: "100%", transform: `translateY(${vi.start}px)` }}>
              {item.type === "group" ? (
                <button
                  type="button"
                  aria-expanded={!collapsed.has(item.g.id)}
                  onClick={() => {
                    const n = new Set(collapsed);
                    if (n.has(item.g.id)) n.delete(item.g.id);
                    else n.add(item.g.id);
                    setCollapsed(n);
                  }}
                  className="flex h-9 w-full items-center gap-2 border-b border-border bg-subtle px-4 text-ui font-medium"
                >
                  <ChevronRight size={14} aria-hidden className={cn("transition-transform rtl:rotate-180", !collapsed.has(item.g.id) && "rotate-90 rtl:rotate-90")} />
                  {item.g.icon}
                  {item.g.label}
                  <span className="tabular font-normal text-fg-secondary">{item.g.rows.length}</span>
                </button>
              ) : (
                <TaskRow
                  task={item.r}
                  href={peekHref(item.r.key)}
                  props={display.props}
                  active={item.r.key === activeKey}
                  selected={selected.has(item.r.id)}
                  onSelect={
                    canBulk
                      ? (on) => {
                          const n = new Set(selected);
                          if (on) n.add(item.r.id);
                          else n.delete(item.r.id);
                          setSelected(n);
                        }
                      : undefined
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────── board ─────────────

/** The board shows the five Figma statuses; closed tasks only appear when "show closed" is on. */
type BoardColumn = StatusGroup | "closed";
const columnOf = (r: { status: string }): BoardColumn => statusGroup(r.status as TaskStatus) ?? "closed";

function BoardView({ rows, display, peekHref }: { rows: TaskRowData[]; display: TaskDisplay; peekHref: (k: string) => string }) {
  const t = useTranslations();
  const { me } = useApp();
  const { run } = useWorkflow();
  const columns: BoardColumn[] = [...STATUS_GROUPS, ...(display.showClosed ? (["closed"] as const) : [])];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  const tryMove = (task: TaskRowData, to: BoardColumn) => {
    if (columnOf(task) === to) return;
    const action = to === "closed" ? null : actionForGroupMove(task.status as TaskStatus, to);
    const wf = toWorkflowTask(task);
    if (!action || !availableActions(me, wf).includes(action)) {
      toast.error(t("tasks.dropNotAllowed", { key: task.key, status: t(`statusGroup.${to}`) }));
      return;
    }
    run(wf, action);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const task = rows.find((r) => r.id === e.active.id);
    const to = e.over?.id as BoardColumn | undefined;
    if (task && to) tryMove(task, to);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${rows.find((r) => r.id === active.id)?.key}.`,
          onDragOver: ({ over }) => (over ? `Over ${t(`statusGroup.${over.id as BoardColumn}`)}.` : "Not over a column."),
          onDragEnd: ({ over }) => (over ? `Dropped on ${t(`statusGroup.${over.id as BoardColumn}`)}.` : "Dropped."),
          onDragCancel: () => "Move cancelled.",
        },
      }}
    >
      <div className="flex h-full gap-3 overflow-x-auto p-3">
        {columns.map((s) => (
          <Column key={s} column={s} rows={rows.filter((r) => columnOf(r) === s)}>
            {rows
              .filter((r) => columnOf(r) === s)
              .map((r) => (
                <Card key={r.id} task={r} href={peekHref(r.key)} onMove={(to) => tryMove(r, to)} columns={columns} />
              ))}
          </Column>
        ))}
      </div>
    </DndContext>
  );
}

function Column({ column, rows, children }: { column: BoardColumn; rows: TaskRowData[]; children: React.ReactNode }) {
  const t = useTranslations("statusGroup");
  const { setNodeRef, isOver } = useDroppable({ id: column });
  return (
    <section ref={setNodeRef} aria-label={t(column)} className={cn("flex w-72 shrink-0 flex-col rounded-card bg-subtle", isOver && "outline-2 outline-accent outline-dashed")}>
      <h2 className="flex h-10 items-center gap-2 px-3 text-ui font-medium">
        <StatusIcon status={column === "closed" ? "closed" : GROUP_REPRESENTATIVE[column]} />
        {t(column)}
        <span className="tabular font-normal text-fg-secondary">{rows.length}</span>
      </h2>
      <div className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">{children}</div>
    </section>
  );
}

function Card({ task, href, onMove, columns }: { task: TaskRowData; href: string; onMove: (to: BoardColumn) => void; columns: readonly BoardColumn[] }) {
  const t = useTranslations();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  return (
    <article
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn("relative min-h-[72px] shrink-0 cursor-grab rounded-card border border-border bg-surface p-2.5 shadow-sm", isDragging && "z-10 opacity-80 shadow-[var(--shadow-pop)]")}
      {...attributes}
      {...listeners}
      aria-roledescription="draggable task"
      aria-label={`${task.key} ${task.title}`}
    >
      <div className="flex items-center gap-1.5 text-meta text-fg-secondary">
        <PriorityIcon priority={(task.priority ?? task.suggestedPriority) as Priority | null} suggested={!task.priority} label={t(`priority.${(task.priority ?? task.suggestedPriority ?? "none") as "urgent"}`)} />
        <Mono>{task.key}</Mono>
        <Menu>
          <MenuTrigger
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label={t("tasks.moveCard", { key: task.key })}
            className="ms-auto inline-flex h-6 w-6 items-center justify-center rounded text-fg-secondary hover:bg-subtle hover:text-fg"
          >
            <MoreHorizontal size={14} aria-hidden />
          </MenuTrigger>
          <MenuContent align="end">
            <MenuLabel>{t("tasks.moveTo")}</MenuLabel>
            {columns
              .filter((c) => c !== columnOf(task))
              .map((c) => (
                <MenuItem key={c} onSelect={() => onMove(c)}>
                  <StatusIcon status={c === "closed" ? "closed" : GROUP_REPRESENTATIVE[c]} />
                  {t(`statusGroup.${c}`)}
                </MenuItem>
              ))}
          </MenuContent>
        </Menu>
      </div>
      <Link href={href} onPointerDown={(e) => e.stopPropagation()} className="mt-1 line-clamp-3 block text-ui font-medium hover:underline">
        {task.title}
      </Link>
      <div className="mt-2 flex items-center gap-2 text-meta text-fg-secondary">
        {task.occurrenceCount > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <Repeat size={11} aria-hidden />
            {task.occurrenceCount}
          </span>
        )}
        {task.attachmentCount > 0 && <Paperclip size={11} aria-label={t("task.attachments")} />}
        <DueDate dueAt={task.dueAt} overdue={task.isOverdue} className="text-meta" />
        <span className="ms-auto">
          <Avatar name={task.assignee?.name} size={18} />
        </span>
      </div>
    </article>
  );
}

// ───────────── bulk ─────────────

function BulkBar({ ids, rows, onDone }: { ids: string[]; rows: TaskRowData[]; onDone: () => void }) {
  const t = useTranslations();
  const { me, members, projects } = useApp();
  const isAbg = me.side === "abg";
  const allShipped = ids.every((id) => rows.find((r) => r.id === id)?.status === "shipped");
  const apply = async (op: "priority" | "assigneeId" | "dueDate" | "projectId" | "close" | "verify", value?: string | null) => {
    const r = await bulkAction({ taskIds: ids, op, value: value ?? null });
    if (r.ok) toast.success(t("tasks.bulkDone", { ok: r.data!.ok, failed: r.data!.failed }));
    else toast.error(t("common.error"));
    onDone();
  };
  return (
    <div role="toolbar" aria-label={t("tasks.selected", { count: ids.length })} className="flex flex-wrap items-center gap-2 border-b border-border bg-info-subtle px-4 py-1.5 text-ui">
      <span className="font-medium">{t("tasks.selected", { count: ids.length })}</span>
      {isAbg && (
        <>
          <Select aria-label={t("tasks.bulkPriority")} className="h-7 w-auto" defaultValue="" onChange={(e) => e.target.value && apply("priority", e.target.value)}>
            <option value="">{t("tasks.bulkPriority")}</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {t(`priority.${p}`)}
              </option>
            ))}
          </Select>
          <Select aria-label={t("tasks.bulkAssignee")} className="h-7 w-auto" defaultValue="" onChange={(e) => e.target.value && apply("assigneeId", e.target.value)}>
            <option value="">{t("tasks.bulkAssignee")}</option>
            {members
              .filter((m) => m.side === "abg" && (me.role === "abg_lead" || m.id === me.id))
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </Select>
          <Input aria-label={t("tasks.bulkDue")} type="date" className="h-7 w-auto" onChange={(e) => e.target.value && apply("dueDate", e.target.value)} />
          <Select aria-label={t("tasks.bulkProject")} className="h-7 w-auto" defaultValue="" onChange={(e) => e.target.value && apply("projectId", e.target.value)}>
            <option value="">{t("tasks.bulkProject")}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.key}
              </option>
            ))}
          </Select>
        </>
      )}
      {!isAbg && (
        <Button size="sm" variant="dangerOutline" onClick={() => apply("close", prompt(t("actions.reason")) ?? "")}>
          {t("tasks.bulkClose")}
        </Button>
      )}
      {me.side === "vendoor" && allShipped && (
        <Button size="sm" variant="success" onClick={() => apply("verify")}>
          {t("tasks.bulkVerify")}
        </Button>
      )}
      <Button size="sm" variant="ghost" className="ms-auto" onClick={onDone}>
        {t("common.clear")}
      </Button>
    </div>
  );
}
