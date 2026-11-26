"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { TaskRow, toWorkflowTask, type TaskRowData } from "@/components/task/task-row";
import { ActionButtons } from "@/components/task/action-buttons";
import { StatusIcon } from "@/components/icons/status-icon";
import { StatusLozenge } from "@/components/ui/lozenge";
import { PriorityIcon } from "@/components/icons/priority-icon";
import { DueDate, Mono, ShortAge } from "@/components/ui/badges";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { TASK_STATUSES, type Priority, type TaskStatus } from "@/domain/types";

export function MyWorkView({ title, subtitle, tabs, tab, rows }: { title: string; subtitle: string; tabs: Array<{ id: string; label: string; count?: number }>; tab: string; rows: TaskRowData[] }) {
  const t = useTranslations();
  const groups = TASK_STATUSES.map((s) => ({ s, rows: rows.filter((r) => r.status === s) })).filter((g) => g.rows.length);
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <nav aria-label={title} className="flex gap-2 overflow-x-auto px-4 py-3">
        {tabs.map((x) => (
          <Link
            key={x.id}
            href={`/my-work?tab=${x.id}`}
            aria-current={tab === x.id ? "page" : undefined}
            className={cn("h-9 shrink-0 whitespace-nowrap rounded-full border px-4 text-[13.5px] font-semibold leading-9", tab === x.id ? "border-fg bg-fg text-white" : "border-border bg-surface text-fg-secondary hover:bg-subtle")}
          >
            {x.label}
            {x.count !== undefined && <span className={cn("tabular ms-1.5 font-medium", tab === x.id ? "text-white/80" : "text-fg-muted")}>{x.count}</span>}
          </Link>
        ))}
      </nav>
      {!rows.length ? (
        <EmptyState title={t("myWork.empty")} />
      ) : (
        <>
        <MobileCards rows={rows} withActions={tab === "waiting"} />
        <div className="hidden md:block">
        {groups.map((g) => (
          <section key={g.s} aria-label={t(`status.${g.s}`)}>
            <h2 className="flex h-9 items-center gap-2 border-b border-border bg-subtle px-4 text-ui font-medium">
              <StatusIcon status={g.s as TaskStatus} />
              {t(`status.${g.s}`)}
              <span className="tabular font-normal text-fg-secondary">{g.rows.length}</span>
            </h2>
            {g.rows.map((r) => (
              <TaskRow key={r.id} task={r} props={["priority", "waiting", "assignee", "due", "project"]} trailing={tab === "waiting" ? <span className="hidden md:block"><ActionButtons task={toWorkflowTask(r)} /></span> : undefined} />
            ))}
          </section>
        ))}
        </div>
        </>
      )}
    </div>
  );
}

/** Phone layout (Figma 6.4): one rounded card per task with the key, status and due, and the next action right on the card. */
function MobileCards({ rows, withActions }: { rows: TaskRowData[]; withActions: boolean }) {
  const t = useTranslations("myWork");
  return (
    <section className="space-y-2 px-4 pb-4 md:hidden" aria-label={t("title")}>
      <h2 className="pt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-muted">{withActions ? t("yourTurn", { count: rows.length }) : t("tasksCount", { count: rows.length })}</h2>
      <ul className="overflow-hidden rounded-card border border-border bg-surface">
        {rows.map((r) => (
          <li key={r.id} className="border-b border-border p-3.5 last:border-b-0">
            <Link href={`/tasks/${r.key}`} className="flex items-start gap-2.5">
              <span className="mt-1">
                <PriorityIcon priority={(r.priority ?? r.suggestedPriority) as Priority | null} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold leading-snug">{r.title}</span>
                <span className="mt-1.5 flex flex-wrap items-center gap-2 text-meta text-fg-secondary">
                  <Mono>{r.key}</Mono>
                  <StatusLozenge status={r.status as TaskStatus} custom={r.customStatus} />
                  {r.dueAt ? <DueDate dueAt={r.dueAt} overdue={r.isOverdue} /> : <ShortAge at={r.statusChangedAt} />}
                </span>
              </span>
              <ChevronRight size={16} className="mt-1 shrink-0 text-fg-muted rtl:rotate-180" aria-hidden />
            </Link>
            {withActions && (
              <div className="mt-3">
                <ActionButtons task={toWorkflowTask(r)} className="flex flex-wrap gap-2 [&>button]:flex-1" />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
