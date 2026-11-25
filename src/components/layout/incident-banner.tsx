"use client";
import Link from "next/link";
import { ArrowRight, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { relative } from "@/lib/format";

/** Persistent banner on every page while a system problem is open (Figma: yellow bar under the topbar). */
export function IncidentBanner({ incident }: { incident: { number: number; title: string; startedAt: string } }) {
  const t = useTranslations("trouble");
  return (
    <div role="status" className="flex min-h-11 shrink-0 items-center gap-3 border-b border-[#f3d98b] bg-warning-subtle px-4 py-1.5 text-[13px] text-warning-text md:px-6">
      <span aria-hidden className="relative grid h-4 w-4 shrink-0 place-items-center">
        <span className="absolute h-4 w-4 animate-ping rounded-full bg-[#f59e0b]/30" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
      </span>
      <span className="shrink-0 font-semibold">{t("bannerTitle", { title: incident.title })}</span>
      <span suppressHydrationWarning className="hidden min-w-0 flex-1 truncate md:block">{t("bannerSince", { age: relative(incident.startedAt) })}</span>
      <span className="flex-1 md:hidden" />
      <Link href="/trouble" className="hidden h-7 shrink-0 items-center gap-1.5 rounded-lg border border-[#f3d98b] bg-white px-2.5 text-[12px] font-semibold sm:inline-flex">
        <Send size={13} aria-hidden />
        {t("alertAbg")}
      </Link>
      <Link href="/trouble" className="inline-flex shrink-0 items-center gap-1.5 font-semibold">
        {t("viewTrouble")}
        <ArrowRight size={14} aria-hidden />
      </Link>
    </div>
  );
}
