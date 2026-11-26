"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Mono, ShortAge } from "@/components/ui/badges";
import { StatusLozenge } from "@/components/ui/lozenge";
import { WaitingBadge } from "@/components/ui/badges";
import { formatDue } from "@/lib/format";
import type { InboxRow } from "@/server/inbox";
import type { Side, TaskStatus } from "@/domain/types";

/** One task in the Inbox list: key, project and age, title, status, whose turn, and a one-line hint. */
export function InboxRowItem({ row, href, selected, viewerSide }: { row: InboxRow; href: string; selected: boolean; viewerSide: Side }) {
  const t = useTranslations("inbox");
  const hint = row.hint;
  const hintText =
    hint?.kind === "verify" ? t("hint.verify", { days: 3 })
    : hint?.kind === "asked" ? t("hint.asked")
    : hint?.kind === "reopened" ? t("hint.reopened")
    : hint?.kind === "overdue" ? t("hint.overdue")
    : hint?.kind === "reply_due" ? t("hint.replyDue", { when: formatDue(hint.dueAt) })
    : null;
  const danger = hint?.kind === "asked" || hint?.kind === "overdue" || hint?.kind === "reopened";
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={selected ? "true" : undefined}
      className={cn("flex flex-col gap-1.5 border-b border-border px-5 py-3 hover:bg-subtle", selected && "bg-info-subtle hover:bg-info-subtle")}
    >
      <span className="flex items-center gap-2 text-[12px] text-fg-muted">
        <span aria-hidden className={cn("h-[7px] w-[7px] shrink-0 rounded-full", row.unread ? "bg-accent" : "bg-transparent")} />
        {row.unread && <span className="sr-only">{t("unread")}</span>}
        <Mono className="text-[12px]">{row.key}</Mono>
        <span className="truncate">{row.project.name}</span>
        <ShortAge at={row.statusChangedAt} className="ms-auto shrink-0 text-[12px]" />
      </span>
      <span className="text-[13.5px] font-semibold leading-[19px] text-fg">{row.title}</span>
      <span className="flex flex-wrap items-center gap-2">
        <StatusLozenge status={row.status as TaskStatus} custom={row.customStatus} />
        <WaitingBadge side={row.waitingOn} viewerSide={viewerSide} />
        {hintText && <span className={cn("text-[11.5px] font-medium", danger ? "text-danger-text" : "text-fg-muted")}>{hintText}</span>}
      </span>
    </Link>
  );
}
