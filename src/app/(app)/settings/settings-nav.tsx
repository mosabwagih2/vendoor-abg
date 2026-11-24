"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

export function SettingsNav() {
  const t = useTranslations("settings");
  const p = usePathname();
  const items = ["members", "projects", "sla", "notifications", "profile"] as const;
  return (
    <nav aria-label={t("title")} className="flex gap-1 overflow-x-auto border-b border-border px-4">
      {items.map((i) => (
        <Link key={i} href={`/settings/${i}`} aria-current={p.endsWith(i) ? "page" : undefined} className={cn("-mb-px shrink-0 border-b-2 px-3 py-2.5 text-ui", p.endsWith(i) ? "border-fg font-medium" : "border-transparent text-fg-secondary hover:text-fg")}>
          {t(i)}
        </Link>
      ))}
    </nav>
  );
}
