"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Bell, Plus, Search } from "lucide-react";

/** Figma topbar: search (⌘K), Create, bell. */
export function Topbar({ onCreate, unread }: { onCreate: () => void; unread: number }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-border bg-surface ps-4 pe-3 md:ps-6 md:pe-5">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const q = ref.current?.value.trim();
          router.push(q ? `/tasks?q=${encodeURIComponent(q)}&closed=1` : "/tasks");
        }}
        className="relative w-full max-w-[380px]"
      >
        <Search size={15} aria-hidden className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-fg-muted" />
        <input ref={ref} aria-label={t("search")} placeholder={t("searchPlaceholder")} className="h-[34px] w-full rounded-lg bg-canvas ps-9 pe-12 text-[13px] placeholder:text-fg-muted" />
        <kbd className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 font-mono text-[11px] text-fg-muted sm:block">⌘K</kbd>
      </form>
      <div className="flex-1" />
      <button type="button" onClick={onCreate} className="inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-white hover:opacity-90">
        <Plus size={14} aria-hidden />
        <span className="hidden sm:inline">{t("create")}</span>
      </button>
      <Link href="/inbox" aria-label={t("notifications")} className="relative grid h-8 w-8 place-items-center rounded-lg text-fg-secondary hover:bg-black/[0.04]">
        <Bell size={18} aria-hidden />
        {unread > 0 && <span aria-hidden className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-surface bg-danger" />}
      </Link>
    </header>
  );
}
