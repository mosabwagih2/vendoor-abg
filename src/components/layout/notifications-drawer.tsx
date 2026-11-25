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
import type { TaskStatus } from "@/domain/types";
import type { DrawerItem } from "@/server/notifications";
import { loadDrawerAction, markAllReadAction } from "@/server/actions/misc";

/** Figma 5.2: bell opens a right-hand drawer with Incoming (unread) and Archive (read), grouped by day. */
export function NotificationsDrawer({ unread }: { unread: number }) {
  const t = useTranslations("drawer");
  const tn = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DrawerItem[] | null>(null);
  const [tab, setTab] = useState<"incoming" | "archive">("incoming");

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
  const shown = tab === "incoming" ? incoming : archive;

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

function Row({ item, onNavigate }: { item: DrawerItem; onNavigate: () => void }) {
  const t = useTranslations("drawer");
  const isIncident = item.incident !== null;
  const href = isIncident ? `/trouble/${item.incident}` : item.task ? `/tasks/${item.task.key}` : "/inbox";
  const text = isIncident ? t("incident", { actor: item.actor ?? "" }) : t(`kind.${item.kind}` as "kind.task.commented", { actor: item.actor ?? t("someone"), task: item.task?.key ?? "" });
  return (
    <li>
      <Link href={href} onClick={onNavigate} className={cn("flex gap-3 border-b border-border px-5 py-3.5 hover:bg-subtle", isIncident && !item.read && "bg-danger-subtle/60")}>
        <span aria-hidden className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", item.read ? "bg-transparent" : isIncident ? "bg-danger" : "bg-accent")} />
        {isIncident ? (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-danger-subtle text-danger">
            <TriangleAlert size={15} aria-hidden />
          </span>
        ) : (
          <Avatar name={item.actor ?? "?"} size={32} />
        )}
        <span className="min-w-0 flex-1">
          <span className={cn("block text-[14px] leading-[1.35]", isIncident && !item.read && "font-semibold text-danger-text")}>{text}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-meta text-fg-muted">
            {item.task && <span className="font-mono">{item.task.key}</span>}
            {isIncident && <span className="font-mono">INC-{item.incident}</span>}
            {item.task && <StatusLozenge status={item.task.status as TaskStatus} />}
            <span suppressHydrationWarning>{shortAge(item.at)}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}
