"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Paperclip, Repeat, ListTree } from "lucide-react";
import { StatusIcon } from "@/components/icons/status-icon";
import { PriorityBadge, WaitingBadge, SlaBadge, DueDate, Mono, RelativeTime } from "@/components/ui/badges";
import { Avatar } from "@/components/ui/avatar";
import { useApp } from "@/components/layout/app-context";
import { cn } from "@/lib/cn";
import type { TaskStatus, Priority } from "@/domain/types";

export interface TaskRowData {
  id: string;
  key: string;
  title: string;
  status: string;
  priority: string | null;
  suggestedPriority: string | null;
  type: string;
  dueAt: string | null;
  updatedAt: string;
  createdAt: string;
  occurrenceCount: number;
  attachmentCount: number;
  reopenCount: number;
  parentId: string | null;
  requesterId: string;
  assigneeId: string | null;
  project: { id: string; key: string; name: string };
  assignee: { id: string; name: string } | null;
  requester: { id: string; name: string };
  waitingOn: "abg" | "vendoor" | null;
  isOverdue: boolean;
  sla: { kind: "first_response" | "resolution"; state: "ok" | "at_risk" | "breached" | "paused"; dueAt: string | null } | null;
  unverified: boolean;
  _count?: { subtasks: number };
}

/** PRD 5.3: same task, same row everywhere: ID, title, status, priority, Waiting on, assignee, due. */
export function TaskRow({
  task,
  href,
  props = ["priority", "waiting", "assignee", "due"],
  selected,
  onSelect,
  trailing,
  active,
}: {
  task: TaskRowData;
  href?: string;
  props?: string[];
  selected?: boolean;
  onSelect?: (v: boolean) => void;
  trailing?: React.ReactNode;
  active?: boolean;
}) {
  const t = useTranslations();
  const { me } = useApp();
  const status = task.status as TaskStatus;
  const p = new Set(props);
  return (
    <div
      className={cn(
        "group relative flex min-h-9 items-center gap-2 border-b border-border px-3 text-ui hover:bg-subtle sm:gap-3 sm:px-4",
        active && "bg-info-subtle hover:bg-info-subtle",
        selected && "bg-info-subtle",
      )}
    >
      {onSelect && (
        <input
          type="checkbox"
          checked={!!selected}
          onChange={(e) => onSelect(e.target.checked)}
          aria-label={t("tasks.selectRow", { key: task.key })}
          className={cn("relative z-10 h-4 w-4 shrink-0", !selected && "sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100")}
        />
      )}
      {p.has("priority") && (
        <span className="relative z-10 shrink-0">
          <PriorityBadge priority={task.priority as Priority | null} suggested={task.suggestedPriority as Priority | null} iconOnly />
        </span>
      )}
      <Mono className="hidden w-[68px] shrink-0 text-fg-secondary sm:inline">{task.key}</Mono>
      <span className="shrink-0">
        <StatusIcon status={status} label={t(`status.${status}`)} />
      </span>
      <Link href={href ?? `/tasks/${task.key}`} className="min-w-0 flex-1 truncate py-2 after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent">
        <span className={cn(status === "closed" && "text-fg-secondary line-through")}>{task.title}</span>
        <Mono className="ms-2 text-fg-muted sm:hidden">{task.key}</Mono>
      </Link>
      <span className="relative z-10 hidden shrink-0 items-center gap-2 text-fg-muted md:flex">
        {task.occurrenceCount > 0 && (
          <span className="inline-flex items-center gap-0.5 text-meta" title={t("task.occurrences")}>
            <Repeat size={12} aria-hidden />
            {task.occurrenceCount}
            <span className="sr-only">{t("task.occurrences")}</span>
          </span>
        )}
        {(task._count?.subtasks ?? 0) > 0 && (
          <span className="inline-flex items-center gap-0.5 text-meta" title={t("task.subtasks")}>
            <ListTree size={12} aria-hidden />
            {task._count!.subtasks}
          </span>
        )}
        {task.attachmentCount > 0 && <Paperclip size={12} aria-label={t("task.attachments")} />}
      </span>
      {p.has("project") && <span className="hidden w-12 shrink-0 font-mono text-[11px] text-fg-muted lg:inline">{task.project.key}</span>}
      {p.has("type") && <span className="hidden w-16 shrink-0 text-meta text-fg-secondary lg:inline">{t(`type.${task.type}`)}</span>}
      <span className="relative z-10 hidden shrink-0 sm:inline-flex">
        <SlaBadge sla={task.sla} />
      </span>
      {task.unverified && <span className="hidden shrink-0 rounded-full bg-warning-subtle px-1.5 text-meta font-medium text-[#8a5a00] sm:inline">{t("sla.unverified")}</span>}
      {p.has("waiting") && <WaitingBadge side={task.waitingOn} viewerSide={me.side} className="relative z-10 shrink-0" />}
      {p.has("requester") && (
        <span className="relative z-10 hidden shrink-0 lg:inline" title={task.requester.name}>
          <Avatar name={task.requester.name} size={20} />
        </span>
      )}
      {p.has("assignee") && (
        <span className="relative z-10 shrink-0" title={task.assignee?.name ?? t("common.unassigned")}>
          <Avatar name={task.assignee?.name} size={20} />
          <span className="sr-only">{task.assignee?.name ?? t("common.unassigned")}</span>
        </span>
      )}
      {p.has("due") && <DueDate dueAt={task.dueAt} overdue={task.isOverdue} className="relative z-10 hidden w-[76px] shrink-0 text-end sm:inline" />}
      {p.has("updated") && (
        <span className="relative z-10 hidden w-20 shrink-0 text-end text-meta xl:inline">
          <RelativeTime at={task.updatedAt} />
        </span>
      )}
      {trailing && <span className="relative z-10 shrink-0">{trailing}</span>}
    </div>
  );
}

export function toWorkflowTask(t: TaskRowData) {
  return {
    id: t.id,
    key: t.key,
    title: t.title,
    status: t.status as TaskStatus,
    requesterId: t.requesterId,
    assigneeId: t.assigneeId,
    priority: t.priority as Priority | null,
    suggestedPriority: t.suggestedPriority as Priority | null,
    projectId: t.project.id,
  };
}
