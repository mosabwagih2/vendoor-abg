"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, CalendarDays, GitBranch, Settings2, SignalHigh, Tag, User, Users } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { id: "general", icon: Settings2 },
  { id: "workflow", icon: GitBranch },
  { id: "work-week", icon: CalendarDays },
  { id: "priorities", icon: SignalHigh },
  { id: "projects", icon: Tag },
  { id: "members", icon: Users },
  { id: "notifications", icon: Bell },
  { id: "profile", icon: User },
] as const;

/** Settings menu (Figma 5.x). Vertical column on desktop, scrolling row on a phone. */
export function SettingsNav({ title }: { title: string }) {
  const t = useTranslations("settings.nav");
  const path = usePathname();
  return (
    <nav aria-label={title} className="shrink-0 border-b border-border bg-canvas md:w-[220px] md:border-b-0 md:border-e md:px-2.5 md:py-5">
      <div className="hidden px-2.5 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-muted md:block">{title}</div>
      <ul className="flex gap-1 overflow-x-auto px-3 py-2 md:block md:space-y-0.5 md:overflow-visible md:p-0">
        {ITEMS.map(({ id, icon: Icon }) => {
          const on = path === `/settings/${id}`;
          return (
            <li key={id} className="shrink-0">
              <Link href={`/settings/${id}`} aria-current={on ? "page" : undefined} className={cn("flex h-9 items-center gap-2.5 rounded-[7px] px-2.5 text-[13.5px] font-medium", on ? "bg-info-subtle font-semibold text-[#1d4ed8]" : "text-fg-secondary hover:bg-black/[0.04]")}>
                <Icon size={16} aria-hidden />
                {t(id)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
