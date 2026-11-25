"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { INBOX_TABS, turnFor, type InboxTab } from "@/domain/inbox";
import type { Side } from "@/domain/types";
import type { InboxRow } from "@/server/inbox";
import { markAllReadAction } from "@/server/actions/misc";
import { InboxRowItem } from "./inbox-row";

/** Left column: title, three tabs (Your turn / Waiting / All) and the grouped list of tasks. */
export function InboxList({ tab, counts, rows, selectedKey, viewerSide }: { tab: InboxTab; counts: Record<InboxTab, number>; rows: InboxRow[]; selectedKey: string | null; viewerSide: Side }) {
  const t = useTranslations("inbox");
  const other = viewerSide === "abg" ? "Vendoor" : "ABG";
  const label = (id: InboxTab) => (id === "turn" ? t("tabTurn") : id === "waiting" ? t("tabWaiting", { side: other }) : t("tabAll"));
  const href = (key: string) => `/inbox?tab=${tab}&t=${key}`;
  const mine = rows.filter((r) => turnFor(r.waitingOn, viewerSide) === "mine");
  const theirs = rows.filter((r) => turnFor(r.waitingOn, viewerSide) !== "mine");
  const groups = [
    { id: "mine", title: t("groupTurn"), rows: mine },
    { id: "theirs", title: t("groupWaiting", { side: other }), rows: theirs },
  ].filter((g) => g.rows.length);

  return (
    <div className="flex min-h-0 flex-col border-border bg-surface md:w-[420px] md:shrink-0 md:border-e">
      <div className="flex h-[52px] shrink-0 items-center gap-3 ps-5 pe-4">
        <h1 className="text-[16px] font-semibold">{t("title")}</h1>
        <Button size="icon" variant="ghost" className="ms-auto" aria-label={t("markAllRead")} title={t("markAllRead")} onClick={() => markAllReadAction()}>
          <CheckCheck size={16} aria-hidden />
        </Button>
      </div>
      <nav aria-label={t("title")} className="flex h-10 shrink-0 items-center gap-[18px] border-b border-border px-5">
        {INBOX_TABS.map((id) => {
          const on = tab === id;
          return (
            <Link key={id} href={`/inbox?tab=${id}`} aria-current={on ? "page" : undefined} className={cn("flex h-10 items-center gap-1.5 border-b-2 text-[13px]", on ? "border-accent font-semibold text-fg" : "border-transparent font-medium text-fg-muted hover:text-fg")}>
              {label(id)}
              <span className={cn("tabular text-[12px] font-semibold", on ? "text-accent" : "text-fg-muted")}>{counts[id]}</span>
            </Link>
          );
        })}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!rows.length ? (
          <InboxEmpty />
        ) : (
          groups.map((g) => (
            <section key={g.id} aria-label={g.title}>
              <h2 className="flex h-7 items-center border-b border-border bg-subtle px-5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
                {g.title} · {g.rows.length}
              </h2>
              {g.rows.map((r) => (
                <InboxRowItem key={r.id} row={r} href={href(r.key)} selected={r.key === selectedKey} viewerSide={viewerSide} />
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function InboxEmpty() {
  const t = useTranslations("inbox");
  return (
    <EmptyState title={t("emptyTitle")}>
      <p className="max-w-xs text-ui text-fg-muted">{t("emptyBody")}</p>
    </EmptyState>
  );
}
