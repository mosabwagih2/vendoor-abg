"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCheck } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Mono, RelativeTime } from "@/components/ui/badges";
import { StatusIcon } from "@/components/icons/status-icon";
import { TaskView } from "@/components/task/task-view";
import { cn } from "@/lib/cn";
import type { TaskStatus } from "@/domain/types";
import type { TaskDetail } from "@/server/task-detail";
import { markAllReadAction } from "@/server/actions/misc";

interface Item {
  id: string;
  kind: string;
  read: boolean;
  at: string;
  actor: string | null;
  task: { id: string; key: string; title: string; status: string } | null;
}

export function InboxView({ filter, items, selectedId, detail }: { filter: string; items: Item[]; selectedId: string | null; detail: TaskDetail | null }) {
  const t = useTranslations("inbox");
  return (
    <div className="flex h-full flex-col max-md:h-auto">
      <PageHeader title={t("title")}>
        <Button size="sm" variant="ghost" onClick={() => markAllReadAction()}>
          <CheckCheck size={14} aria-hidden />
          {t("markAllRead")}
        </Button>
      </PageHeader>
      <div className="grid min-h-0 flex-1 md:grid-cols-[380px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col border-e border-border bg-surface">
          <nav aria-label={t("title")} className="flex gap-1 border-b border-border px-3 py-1.5">
            {(["all", "unread", "mentions", "waiting"] as const).map((f) => (
              <Link key={f} href={`/inbox?filter=${f}`} aria-current={filter === f ? "page" : undefined} className={cn("h-7 rounded-full px-2.5 text-meta leading-7", filter === f ? "bg-primary text-primary-fg" : "text-fg-secondary hover:bg-subtle")}>
                {t(f)}
              </Link>
            ))}
          </nav>
          {!items.length ? (
            <EmptyState title={t("empty")} />
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/inbox?filter=${filter}&n=${n.id}`}
                    scroll={false}
                    aria-current={n.id === selectedId ? "true" : undefined}
                    className={cn("flex gap-2 border-b border-border px-3 py-2.5 hover:bg-subtle", n.id === selectedId && "bg-info-subtle hover:bg-info-subtle")}
                  >
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-waiting")} aria-label={n.read ? undefined : t("unread")} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-meta text-fg-secondary">
                        {n.task && <StatusIcon status={n.task.status as TaskStatus} size={12} />}
                        {n.task && <Mono>{n.task.key}</Mono>}
                        <RelativeTime at={n.at} className="ms-auto text-meta" />
                      </span>
                      <span className={cn("block truncate text-ui", !n.read && "font-semibold")}>{n.task?.title ?? "—"}</span>
                      <span className="block text-meta text-fg-secondary">
                        {t(`kind.${n.kind.replace(".", "_")}` as "kind.task_new_request")}
                        {n.actor ? ` · ${n.actor}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={cn("min-h-0 overflow-y-auto", !detail && "max-md:hidden")}>{detail ? <TaskView task={detail} compact /> : <EmptyState title={t("select")} />}</div>
      </div>
    </div>
  );
}
