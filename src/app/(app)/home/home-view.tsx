"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Rocket, PartyPopper } from "lucide-react";
import { Mono, PriorityBadge, DueDate, SlaBadge, StatusBadge } from "@/components/ui/badges";
import { ActionButtons } from "@/components/task/action-buttons";
import { JourneyBar } from "@/components/task/journey-bar";
import { TaskRow, toWorkflowTask, type TaskRowData } from "@/components/task/task-row";
import { ActivityLine } from "@/components/task/activity-line";
import { Avatar } from "@/components/ui/avatar";
import { useApp } from "@/components/layout/app-context";
import { formatDue, relative } from "@/lib/format";
import type { FeedItem } from "@/server/activity-feed";
import type { Priority, TaskStatus } from "@/domain/types";

export function HomeView({
  greeting,
  summary,
  waiting,
  overdue,
  abgWork,
  lastRelease,
  upcoming,
  feed,
}: {
  greeting: string;
  summary: { waiting: number; progress: number; overdue: number };
  waiting: TaskRowData[];
  overdue: TaskRowData[];
  abgWork: TaskRowData[];
  lastRelease: { number: string; releasedAt: string; verified: number; pending: number; reopened: number } | null;
  upcoming: { date: string; count: number } | null;
  feed: FeedItem[];
}) {
  const t = useTranslations("home");
  const { me } = useApp();
  const allEmpty = !waiting.length && !overdue.length;
  const total = lastRelease ? Math.max(1, lastRelease.verified + lastRelease.pending + lastRelease.reopened) : 1;
  return (
    <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-10 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[40px] leading-[1.02] tracking-[-0.02em] sm:text-[52px]">{greeting}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-fg-secondary">
            <b className="font-semibold text-waiting-strong">{t("summaryWaiting", { count: summary.waiting })}</b>
            <i aria-hidden className="h-[3px] w-[3px] rounded-full bg-border-strong" />
            {t("summaryProgress", { count: summary.progress })}
            {summary.overdue > 0 && (
              <>
                <i aria-hidden className="h-[3px] w-[3px] rounded-full bg-border-strong" />
                <span className="font-medium text-danger-text">{t("summaryOverdue", { count: summary.overdue })}</span>
              </>
            )}
          </p>
        </div>
        {upcoming && me.side === "vendoor" && (
          <p className="inline-flex h-9 items-center gap-2 rounded-control border border-border bg-surface px-3 text-ui text-fg-secondary">
            <Rocket size={15} aria-hidden />
            {t("nextReleaseLabel")}
            <b className="font-semibold text-fg">{formatDue(upcoming.date)} · {t("tasksCount", { count: upcoming.count })}</b>
          </p>
        )}
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-9">
          {allEmpty && (
            <section className="flex flex-col items-center rounded-card border border-border bg-surface px-4 py-14 text-center">
              <PartyPopper size={28} className="text-st-done" aria-hidden />
              <h2 className="mt-3 text-heading font-semibold">{t("caughtUp")}</h2>
              <p className="text-ui text-fg-secondary">{t("caughtUpHint")}</p>
            </section>
          )}

          {waiting.length > 0 && (
            <section aria-labelledby="h-waiting">
              <h2 id="h-waiting" className="mb-3 flex items-center gap-2 text-ui font-semibold">
                <span className="h-2 w-2 rounded-full bg-waiting" aria-hidden />
                {t("waitingOnYou")}
                <span className="tabular font-normal text-fg-secondary">{waiting.length}</span>
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {waiting.map((task) => (
                  <li key={task.id} className="flex flex-col gap-3 rounded-card border border-[#c9d8fb] bg-surface p-4 shadow-[0_2px_10px_rgba(37,99,235,0.07)]">
                    <div className="flex items-center gap-2 text-meta">
                      <Mono className="text-fg-secondary">{task.key}</Mono>
                      <StatusBadge status={task.status as TaskStatus} className="rounded-full bg-sunken px-2 py-0.5 text-[11.5px]" />
                      <span className="ms-auto">
                        <SlaBadge sla={task.sla} />
                      </span>
                    </div>
                    <Link href={`/tasks/${task.key}`} className="line-clamp-2 text-[15px] font-semibold leading-snug hover:underline">
                      {task.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-meta text-fg-secondary">
                      <PriorityBadge priority={task.priority as Priority | null} suggested={task.suggestedPriority as Priority | null} className="text-meta" />
                      {task.assignee && (
                        <span className="inline-flex items-center gap-1">
                          <Avatar name={task.assignee.name} size={16} />
                          {task.assignee.name}
                        </span>
                      )}
                      <span>{relative(task.updatedAt)}</span>
                      {task.dueAt && <DueDate dueAt={task.dueAt} overdue={task.isOverdue} className="text-meta" />}
                    </div>
                    <div className="mt-auto pt-1">
                      <ActionButtons task={toWorkflowTask(task)} size="md" only={["verify", "reopen", "answer", "accept", "ask_info", "decline", "start", "ship"]} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {abgWork.length > 0 && me.side === "vendoor" && (
            <section aria-labelledby="h-abg">
              <h2 id="h-abg" className="mb-3 flex items-center gap-2 text-ui font-semibold">
                <span className="h-2 w-2 rounded-full bg-fg-secondary" aria-hidden />
                {t("abgWorking")}
                <span className="tabular font-normal text-fg-secondary">{summary.progress}</span>
              </h2>
              <div className="overflow-hidden rounded-card border border-border bg-surface">
                {abgWork.map((task) => (
                  <TaskRow key={task.id} task={task} props={["priority", "assignee"]} />
                ))}
              </div>
            </section>
          )}

          {overdue.length > 0 && (
            <section aria-labelledby="h-overdue">
              <h2 id="h-overdue" className="mb-3 flex items-center gap-2 text-ui font-semibold">
                <span className="h-2 w-2 rounded-full bg-danger" aria-hidden />
                {t("overdue")}
                <span className="tabular font-normal text-fg-secondary">{overdue.length}</span>
              </h2>
              <div className="overflow-hidden rounded-card border border-border bg-surface">
                {overdue.map((task) => (
                  <TaskRow key={task.id} task={task} props={["priority", "waiting", "assignee", "due"]} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-8">
          {lastRelease && (
            <section aria-labelledby="h-shipped" className="rounded-card border border-border bg-surface p-4">
              <h2 id="h-shipped" className="text-[11px] font-semibold uppercase tracking-wider text-fg-secondary">
                {t("lastRelease")}
              </h2>
              <Link href={`/releases/${lastRelease.number}`} className="mt-1.5 block font-mono text-[13px] font-semibold hover:underline">
                {lastRelease.number}
              </Link>
              <div className="mt-3 flex h-1.5 gap-[3px]" aria-hidden>
                <div className="rounded-full bg-st-done" style={{ flex: lastRelease.verified / total }} />
                <div className="rounded-full bg-st-shipped" style={{ flex: lastRelease.pending / total }} />
                <div className="rounded-full bg-st-reopened" style={{ flex: lastRelease.reopened / total }} />
              </div>
              <p className="mt-2.5 text-meta text-fg-secondary">{t("verifiedPending", lastRelease)}</p>
            </section>
          )}
          <section aria-labelledby="h-activity">
            <h2 id="h-activity" className="mb-1 text-ui font-semibold">
              {t("activity")}
            </h2>
            <ul className="divide-y divide-border/70">
              {feed.slice(0, 8).map((e) => (
                <ActivityLine key={e.id} e={e} />
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

void JourneyBar;
