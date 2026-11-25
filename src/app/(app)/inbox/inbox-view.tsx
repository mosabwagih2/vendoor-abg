"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/layout/page-header";
import { TaskView } from "@/components/task/task-view";
import type { InboxTab } from "@/domain/inbox";
import type { Side } from "@/domain/types";
import type { InboxRow } from "@/server/inbox";
import type { TaskDetail } from "@/server/task-detail";
import { InboxList } from "./inbox-list";

interface Props {
  tab: InboxTab;
  counts: Record<InboxTab, number>;
  rows: InboxRow[];
  selectedKey: string | null;
  /** True when the URL names a task. On a phone the list shows first and the task only after a tap. */
  explicit: boolean;
  detail: TaskDetail | null;
  viewerSide: Side;
}

/** Figma 1.2: split view. Desktop shows both columns, a phone shows one at a time. */
export function InboxView({ tab, counts, rows, selectedKey, explicit, detail, viewerSide }: Props) {
  const t = useTranslations("inbox");
  return (
    <div className="flex h-full min-h-0 max-md:flex-col">
      <div className={cn("min-h-0 max-md:flex-1", explicit && "max-md:hidden")}>
        <InboxList tab={tab} counts={counts} rows={rows} selectedKey={selectedKey} viewerSide={viewerSide} />
      </div>
      <div className={cn("min-h-0 min-w-0 flex-1 overflow-y-auto", !explicit && "max-md:hidden")}>
        {explicit && (
          <Link href={`/inbox?tab=${tab}`} className="flex h-10 items-center gap-1.5 border-b border-border px-4 text-ui text-fg-secondary md:hidden">
            <ArrowLeft size={16} aria-hidden />
            {t("back")}
          </Link>
        )}
        {detail ? <TaskView task={detail} compact /> : <EmptyState title={t("selectTask")} />}
      </div>
    </div>
  );
}
