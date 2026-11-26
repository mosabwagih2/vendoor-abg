"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Expand } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { Mono, SlaBadge, PriorityBadge } from "@/components/ui/badges";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TaskView } from "@/components/task/task-view";
import { useApp } from "@/components/layout/app-context";
import { cn } from "@/lib/cn";
import { distance } from "@/lib/format";
import type { TaskRowData } from "@/components/task/task-row";
import type { TaskDetail } from "@/server/task-detail";
import type { Priority } from "@/domain/types";

export function RequestsView({ rows, selected, title }: { rows: TaskRowData[]; selected: TaskDetail | null; title: string }) {
  const t = useTranslations("requests");
  const { me } = useApp();
  const router = useRouter();
  const idx = rows.findIndex((r) => r.key === selected?.key);
  const go = (i: number) => rows[i] && router.push(`/requests?peek=${rows[i].key}`, { scroll: false });

  // J/K or arrows step through the queue (PRD 9.5).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select, [role=dialog]")) return;
      if (e.key === "j" || e.key === "ArrowDown") go(idx + 1);
      if (e.key === "k" || e.key === "ArrowUp") go(idx - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex h-full flex-col max-md:h-auto">
      <PageHeader title={title} subtitle={me.side === "vendoor" ? t("readOnly") : t("subtitle")}>
        <span className="tabular rounded-full bg-subtle px-2 text-meta font-medium">{rows.length}</span>
      </PageHeader>
      {!rows.length ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="grid min-h-0 flex-1 md:grid-cols-[380px_minmax(0,1fr)]">
          <ul aria-label={t("queue")} className="min-h-0 overflow-y-auto border-e border-border bg-surface max-md:border-b">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/requests?peek=${r.key}`}
                  scroll={false}
                  aria-current={r.key === selected?.key ? "true" : undefined}
                  className={cn("block border-b border-border px-4 py-3 hover:bg-subtle", r.key === selected?.key && "bg-info-subtle hover:bg-info-subtle")}
                >
                  <div className="flex items-center gap-2 text-meta text-fg-secondary">
                    <Mono>{r.key}</Mono>
                    <PriorityBadge priority={r.priority as Priority | null} suggested={r.suggestedPriority as Priority | null} iconOnly />
                    <span suppressHydrationWarning>{t("age", { age: distance(r.createdAt) })}</span>
                    <span className="ms-auto">
                      <SlaBadge sla={r.sla} />
                    </span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-ui font-medium">{r.title}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-meta text-fg-secondary">
                    <Avatar name={r.requester.name} size={16} />
                    {r.requester.name} · {r.project.key}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="min-h-0 overflow-y-auto">
            {selected ? (
              <>
                <div className="sticky top-0 z-10 flex items-center gap-1 border-b border-border bg-canvas/95 px-4 py-1.5 backdrop-blur">
                  <Button size="icon" variant="ghost" aria-label={t("prev")} disabled={idx <= 0} onClick={() => go(idx - 1)}>
                    <ChevronUp size={16} aria-hidden />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={t("next")} disabled={idx >= rows.length - 1} onClick={() => go(idx + 1)}>
                    <ChevronDown size={16} aria-hidden />
                  </Button>
                  <span className="tabular text-meta text-fg-secondary">
                    {idx + 1} / {rows.length}
                  </span>
                  <Button asChild size="sm" variant="ghost" className="ms-auto">
                    <Link href={`/tasks/${selected.key}`}>
                      <Expand size={14} aria-hidden />
                      {selected.key}
                    </Link>
                  </Button>
                </div>
                <TaskView task={selected} compact lean />
              </>
            ) : (
              <EmptyState title={t("noSelection")} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
