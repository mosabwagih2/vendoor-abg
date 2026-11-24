"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PartyPopper, Rocket } from "lucide-react";
import { Mono, WaitingBadge, PriorityBadge, DueDate, SlaBadge } from "@/components/ui/badges";
import { StatusBadge } from "@/components/ui/badges";
import { ActionButtons } from "@/components/task/action-buttons";
import { TaskRow, toWorkflowTask, type TaskRowData } from "@/components/task/task-row";
import { ActivityLine } from "@/components/task/activity-line";
import { useApp } from "@/components/layout/app-context";
import { formatDue } from "@/lib/format";
import type { FeedItem } from "@/server/activity-feed";
import type { Priority, TaskStatus } from "@/domain/types";

export function HomeView({
  greeting,
  summary,
  waiting,
  overdue,
  lastRelease,
  upcoming,
  feed,
}: {
  greeting: string;
  summary: string;
  waiting: TaskRowData[];
  overdue: TaskRowData[];
  lastRelease: { number: string; releasedAt: string; verified: number; pending: number; reopened: number } | null;
  upcoming: { date: string; count: number } | null;
  feed: FeedItem[];
}) {
  const t = useTranslations("home");
  const { me } = useApp();
  const allEmpty = !waiting.length && !overdue.length;
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
      <h1 className="text-display font-semibold">{greeting}</h1>
      <p className="mt-1 text-body text-fg-secondary">{summary}</p>
      {upcoming && me.side === "vendoor" && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-subtle px-3 py-1 text-ui text-fg-secondary">
          <Rocket size={14} aria-hidden />
          {t("nextRelease", { date: formatDue(upcoming.date), count: upcoming.count })}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-8">
          {allEmpty && (
            <section className="flex flex-col items-center rounded-card border border-border bg-surface px-4 py-12 text-center">
              <PartyPopper size={28} className="text-st-done" aria-hidden />
              <h2 className="mt-3 text-heading font-semibold">{t("caughtUp")}</h2>
              <p className="text-ui text-fg-secondary">{t("caughtUpHint")}</p>
            </section>
          )}

          {waiting.length > 0 && (
            <section aria-labelledby="h-waiting">
              <h2 id="h-waiting" className="mb-2 flex items-center gap-2 text-heading font-semibold">
                <span className="h-2 w-2 rounded-full bg-waiting" aria-hidden />
                {t("waitingOnYou")}
                <span className="tabular text-ui font-normal text-fg-muted">{waiting.length}</span>
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {waiting.map((task) => (
                  <li key={task.id} className="flex flex-col gap-2 rounded-card border border-border border-s-4 border-s-waiting bg-surface p-3">
                    <div className="flex items-center gap-2 text-meta text-fg-secondary">
                      <Mono>{task.key}</Mono>
                      <StatusBadge status={task.status as TaskStatus} className="text-meta" />
                      <span className="ms-auto">
                        <SlaBadge sla={task.sla} />
                      </span>
                    </div>
                    <Link href={`/tasks/${task.key}`} className="line-clamp-2 text-body font-medium hover:underline">
                      {task.title}
                    </Link>
                    <div className="flex items-center gap-2 text-meta text-fg-secondary">
                      <PriorityBadge priority={task.priority as Priority | null} suggested={task.suggestedPriority as Priority | null} className="text-meta" />
                      {task.dueAt && <DueDate dueAt={task.dueAt} overdue={task.isOverdue} className="text-meta" />}
                    </div>
                    <ActionButtons task={toWorkflowTask(task)} only={["verify", "reopen", "answer", "accept", "ask_info", "decline", "start", "ship"]} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {overdue.length > 0 && (
            <section aria-labelledby="h-overdue">
              <h2 id="h-overdue" className="mb-2 flex items-center gap-2 text-heading font-semibold">
                <span className="h-2 w-2 rounded-full bg-danger" aria-hidden />
                {t("overdue")}
                <span className="tabular text-ui font-normal text-fg-muted">{overdue.length}</span>
              </h2>
              <div className="overflow-hidden rounded-card border border-border bg-surface">
                {overdue.map((task) => (
                  <TaskRow key={task.id} task={task} props={["priority", "waiting", "assignee", "due"]} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {lastRelease && (
            <section aria-labelledby="h-shipped" className="rounded-card border border-border bg-surface p-4">
              <h2 id="h-shipped" className="mb-1 text-ui font-semibold">
                {t("recentlyShipped")}
              </h2>
              <Link href={`/releases/${lastRelease.number}`} className="font-mono text-[13px] hover:underline">
                {lastRelease.number}
              </Link>
              <p className="mt-1 text-meta text-fg-secondary">{t("verifiedPending", lastRelease)}</p>
              <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden>
                <div className="bg-st-done" style={{ flex: lastRelease.verified }} />
                <div className="bg-st-shipped" style={{ flex: lastRelease.pending }} />
                <div className="bg-st-reopened" style={{ flex: lastRelease.reopened }} />
              </div>
            </section>
          )}
          <section aria-labelledby="h-activity">
            <h2 id="h-activity" className="mb-1 text-ui font-semibold">
              {t("activity")}
            </h2>
            <ul className="divide-y divide-border">
              {feed.map((e) => (
                <ActivityLine key={e.id} e={e} />
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

void WaitingBadge;
