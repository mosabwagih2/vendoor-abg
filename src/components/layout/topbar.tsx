"use client";
import { NotificationsDrawer } from "./notifications-drawer";
import { useTranslations } from "next-intl";
import { Plus, Search } from "lucide-react";

/** Figma topbar: search (⌘K), Create, bell. */
export function Topbar({ onCreate, onSearch, unread }: { onCreate: () => void; onSearch: () => void; unread: number }) {
  const t = useTranslations("nav");
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-border bg-surface ps-4 pe-3 md:ps-6 md:pe-5">
      <button type="button" onClick={onSearch} aria-label={t("search")} className="relative flex h-[34px] w-full max-w-[380px] items-center rounded-lg bg-canvas ps-9 pe-12 text-start text-[13px] text-fg-muted">
        <Search size={15} aria-hidden className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2" />
        {t("searchPlaceholder")}
        <kbd className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 font-mono text-[11px] text-fg-muted sm:block">⌘K</kbd>
      </button>
      <div className="flex-1" />
      <button type="button" onClick={onCreate} aria-label={t("newRequest")} className="inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-white hover:opacity-90">
        <Plus size={14} aria-hidden />
        <span className="hidden sm:inline">{t("create")}</span>
      </button>
      <NotificationsDrawer unread={unread} />
    </header>
  );
}
