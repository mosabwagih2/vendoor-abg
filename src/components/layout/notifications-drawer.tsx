"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import * as D from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { Bell, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { StatusLozenge } from "@/components/ui/lozenge";
import { Avatar } from "@/components/ui/avatar";
import { shortAge } from "@/lib/format";
import { groupByDay } from "@/domain/notification-groups";
import { DRAWER_FILTERS, countsFor, filterDrawer, type DrawerFilter } from "@/domain/drawer-filter";
import { ActionButtons } from "@/components/task/action-buttons";
import { availableActions } from "@/components/task/workflow-actions";
import { useApp } from "@/components/layout/app-context";
import type { Priority, TaskStatus } from "@/domain/types";
import type { DrawerItem } from "@/server/notifications";
import { alertAbgAction, loadDrawerAction, markAllReadAction } from "@/server/actions/misc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/** Figma 5.2: bell opens a right-hand drawer with Incoming (unread) and Archive (read), grouped by day. */
export function NotificationsDrawer({ unread }: { unread: number }) {
  const t = useTranslations("drawer");
  const tn = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DrawerItem[] | null>(null);
  const [tab, setTab] = useState<"incoming" | "archive">("incoming");
  const [filter, setFilter] = useState<DrawerFilter>("all");
  const { me } = useApp();
  const needsMe = (i: DrawerItem) => !!i.task && !i.read && hasNextStep(me, i.task);

  const load = useCallback(async () => {
    const r = await loadDrawerAction();
    if (r.ok) setItems(r.data as DrawerItem[]);
  }, []);
  // Load when the drawer opens (from the open handler, so there is no state update inside an effect).
  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) void load();
  };

  const incoming = (items ?? []).filter((i) => !i.read);
  const archive = (items ?? []).filter((i) => i.read);
  const base = tab === "incoming" ? incoming : archive;
  const shown = filterDrawer(base, filter, needsMe);
  const counts = countsFor(base, needsMe);

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Trigger aria-label={tn("notifications")} className="relative grid h-8 w-8 place-items-center rounded-lg text-fg-secondary hover:bg-black/[0.04]">
        <Bell size={18} aria-hidden />
        {unread > 0 && <span aria-hidden className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-surface bg-danger" />}
      </D.Trigger>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-black/25" />
        <D.Content className="fixed inset-y-0 end-0 z-50 flex w-full flex-col bg-surface shadow-[var(--shadow-pop)] focus:outline-none sm:w-[440px] sm:border-s sm:border-border">
          <div className="flex h-14 shrink-0 items-center gap-3 px-5">
            <D.Title className="text-[17px] font-semibold">{t("title")}</D.Title>
            <D.Description className="sr-only">{t("title")}</D.Description>
            <button
              type="button"
              className="ms-auto text-[13px] font-medium text-accent hover:underline disabled:opacity-40"
              disabled={!incoming.length}
              onClick={async () => {
                await markAllReadAction();
                await load();
              }}
            >
              {t("markAllRead")}
            </button>
            <D.Close aria-label={t("close")} className="rounded-control p-1 text-fg-secondary hover:bg-subtle">
              <X size={18} />
            </D.Close>
          </div>
          <div role="tablist" className="flex shrink-0 gap-5 border-b border-border px-5">
            {(["incoming", "archive"] as const).map((k) => (
              <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("-mb-px h-10 border-b-2 text-ui", tab === k ? "border-accent font-semibold text-fg" : "border-transparent text-fg-secondary")}>
                {t(k)}
                {k === "incoming" && incoming.length > 0 && <span className="ms-1.5 text-accent">{incoming.length}</span>}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 gap-2 px-5 py-3" role="group" aria-label={t("filters")}>
            {DRAWER_FILTERS.map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={cn("h-8 rounded-full border px-3.5 text-[13px] font-semibold", filter === f ? "border-fg bg-fg text-white" : "border-border bg-surface text-fg-secondary")}>
                {t(`filter.${f}`)}
                {f !== "all" && counts[f] > 0 && <span className="ms-1.5 font-medium opacity-70">{counts[f]}</span>}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {items === null ? (
              <p className="p-5 text-ui text-fg-secondary">{t("loading")}</p>
            ) : shown.length === 0 ? (
              <p className="p-8 text-center text-ui text-fg-secondary">{tab === "incoming" ? t("emptyIncoming") : t("emptyArchive")}</p>
            ) : (
              groupByDay(shown).map((g) => (
                <section key={g.bucket}>
                  <h3 className="bg-canvas px-5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-muted">{t(`day.${g.bucket}`)}</h3>
                  <ul>
                    {g.items.map((i) => (
                      <Row key={i.id} item={i} onNavigate={() => setOpen(false)} />
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/** True when the viewer has a real next step on the task. Cancel alone does not count: it never needs attention. */
function hasNextStep(me: Parameters<typeof availableActions>[0], t: NonNullable<DrawerItem["task"]>) {
  return availableActions(me, toWf(t)).some((a) => a !== "cancel");
}

function toWf(t: NonNullable<DrawerItem["task"]>) {
  return { id: t.id, key: t.key, title: t.title, status: t.status as TaskStatus, requesterId: t.requesterId, assigneeId: t.assigneeId, priority: t.priority as Priority | null, suggestedPriority: t.suggestedPriority as Priority | null };
}

function Row({ item, onNavigate }: { item: DrawerItem; onNavigate: () => void }) {
  const t = useTranslations("drawer");
  const { me } = useApp();
  const isIncident = item.incident !== null;
  const href = isIncident ? `/trouble/${item.incident}` : item.task ? `/tasks/${item.task.key}` : "/inbox";
  const text = isIncident ? t("incident", { actor: item.actor ?? "" }) : t(`kind.${item.kind}` as "kind.task.commented", { actor: item.actor ?? t("someone"), task: item.task?.key ?? "" });
  const showActions = !item.read && item.task && hasNextStep(me, item.task);
  return (
    <li className={cn("border-b border-border px-5 py-3.5", isIncident && !item.read && "bg-danger-subtle/60")}>
      <div className="flex gap-3">
        <span aria-hidden className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", item.read ? "bg-transparent" : isIncident ? "bg-danger" : "bg-accent")} />
        {isIncident ? (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-danger-subtle text-danger">
            <TriangleAlert size={15} aria-hidden />
          </span>
        ) : (
          <Avatar name={item.actor ?? "?"} size={32} />
        )}
        <div className="min-w-0 flex-1">
          <Link href={href} onClick={onNavigate} className="block hover:underline">
            <span className={cn("block text-[14px] leading-[1.35]", isIncident && !item.read && "font-semibold text-danger-text")}>{text}</span>
          </Link>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-meta text-fg-muted">
            {item.task && <span className="font-mono">{item.task.key}</span>}
            {isIncident && <span className="font-mono">INC-{item.incident}</span>}
            {item.task && <StatusLozenge status={item.task.status as TaskStatus} />}
            <span suppressHydrationWarning>{shortAge(item.at)}</span>
          </span>
          {showActions && item.task && <ActionButtons task={toWf(item.task)} className="mt-2.5 flex flex-wrap gap-2" />}
          {isIncident && !item.read && item.incidentId && (
            <div className="mt-2.5 flex gap-2">
              <Button
                size="sm"
                variant="dark"
                onClick={async () => {
                  const r = await alertAbgAction(item.incidentId!);
                  r.ok ? toast.success(t("alerted")) : toast.error(r.message ?? t("alertFailed"));
                }}
              >
                {t("alertAbg")}
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href={href} onClick={onNavigate}>
                  {t("open")}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
