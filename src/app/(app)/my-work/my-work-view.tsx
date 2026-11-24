"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { TaskRow, toWorkflowTask, type TaskRowData } from "@/components/task/task-row";
import { ActionButtons } from "@/components/task/action-buttons";
import { StatusIcon } from "@/components/icons/status-icon";
import { cn } from "@/lib/cn";
import { TASK_STATUSES, type TaskStatus } from "@/domain/types";

export function MyWorkView({ title, tabs, tab, rows }: { title: string; tabs: Array<{ id: string; label: string }>; tab: string; rows: TaskRowData[] }) {
  const t = useTranslations();
  const groups = TASK_STATUSES.map((s) => ({ s, rows: rows.filter((r) => r.status === s) })).filter((g) => g.rows.length);
  return (
    <div>
      <PageHeader title={title} />
      <nav aria-label={title} className="flex gap-1 overflow-x-auto border-b border-border px-4">
        {tabs.map((x) => (
          <Link
            key={x.id}
            href={`/my-work?tab=${x.id}`}
            aria-current={tab === x.id ? "page" : undefined}
            className={cn("-mb-px shrink-0 border-b-2 px-3 py-2.5 text-ui", tab === x.id ? "border-fg font-medium" : "border-transparent text-fg-secondary hover:text-fg")}
          >
            {x.label}
          </Link>
        ))}
      </nav>
      {!rows.length ? (
        <EmptyState title={t("myWork.empty")} />
      ) : (
        groups.map((g) => (
          <section key={g.s} aria-label={t(`status.${g.s}`)}>
            <h2 className="flex h-9 items-center gap-2 border-b border-border bg-subtle px-4 text-ui font-medium">
              <StatusIcon status={g.s as TaskStatus} />
              {t(`status.${g.s}`)}
              <span className="tabular font-normal text-fg-muted">{g.rows.length}</span>
            </h2>
            {g.rows.map((r) => (
              <TaskRow key={r.id} task={r} props={["priority", "waiting", "assignee", "due", "project"]} trailing={tab === "waiting" ? <span className="hidden md:block"><ActionButtons task={toWorkflowTask(r)} /></span> : undefined} />
            ))}
          </section>
        ))
      )}
    </div>
  );
}
