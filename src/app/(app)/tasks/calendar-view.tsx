"use client";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Sun } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusLozenge } from "@/components/ui/lozenge";
import { PriorityIcon } from "@/components/icons/priority-icon";
import type { TaskRowData } from "@/components/task/task-row";
import { cn } from "@/lib/cn";
import { layoutWeek, monthWeeks, oneWeek, stepAnchor, type CalItem } from "@/domain/calendar-layout";
import { localDateKey } from "@/domain/sla";
import { statusGroup, type StatusGroup } from "@/domain/status-display";
import type { Priority, TaskStatus } from "@/domain/types";

const TZ = "Africa/Cairo";
const BAR: Record<StatusGroup, string> = {
  request: "border-[#8b5cf6] bg-[#f1ebfe] text-[#5b34b8]",
  processing: "border-[#f59e0b] bg-[#fdf1d4] text-[#8a5a00]",
  stuck: "border-[#e5484d] bg-[#fdeaea] text-[#a8262b]",
  completed: "border-[#2563eb] bg-[#e4edff] text-[#1d4ed8]",
  done: "border-[#16a06a] bg-[#e1f5ec] text-[#0f7f55]",
};
const WEEKDAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
const ROW_H = 24;

const monthName = (key: string) => new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));

/** Figma 3.3: tasks as bars from the day they were filed to their deadline, Friday shaded, and a "No deadline" list on the right. */
export function CalendarView({ rows, peekHref }: { rows: TaskRowData[]; peekHref: (key: string) => string }) {
  const t = useTranslations("tasks.calendar");
  const today = localDateKey(new Date(), TZ);
  const [anchor, setAnchor] = useState(today);
  const [mode, setMode] = useState<"month" | "week">("month");

  const dated = rows.filter((r) => r.dueAt);
  const undated = rows.filter((r) => !r.dueAt && r.status !== "done" && r.status !== "closed");
  const items: CalItem[] = dated.map((r) => {
    const start = localDateKey(new Date(r.createdAt), TZ);
    const end = localDateKey(new Date(r.dueAt!), TZ);
    return { id: r.key, start: start <= end ? start : end, end };
  });
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const weeks = mode === "month" ? monthWeeks(anchor) : oneWeek(anchor);
  const title = mode === "month" ? monthName(anchor) : t("weekOf", { date: weeks[0][0].key });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <button type="button" aria-label={t("prev")} onClick={() => setAnchor(stepAnchor(anchor, mode, -1))} className="grid h-8 w-8 place-items-center rounded-control border border-border hover:bg-subtle">
          <ChevronLeft size={15} aria-hidden />
        </button>
        <button type="button" aria-label={t("next")} onClick={() => setAnchor(stepAnchor(anchor, mode, 1))} className="grid h-8 w-8 place-items-center rounded-control border border-border hover:bg-subtle">
          <ChevronRight size={15} aria-hidden />
        </button>
        <h2 className="text-[16px] font-semibold">{title}</h2>
        <button type="button" onClick={() => setAnchor(today)} className="h-8 rounded-control border border-border px-3 text-ui font-medium hover:bg-subtle">
          {t("today")}
        </button>
        <div className="inline-flex rounded-control bg-subtle p-0.5" role="group" aria-label={t("mode")}>
          {(["month", "week"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={cn("rounded px-3 py-1 text-ui", mode === m ? "bg-surface font-medium shadow-sm" : "text-fg-secondary")}>
              {t(m)}
            </button>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-2.5 py-1 text-meta text-fg-secondary">
          <Sun size={12} aria-hidden />
          {t("weekNote")}
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-7 border-b border-border text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
              {WEEKDAYS.map((d, i) => (
                <div key={d} className={cn("px-2 py-1.5", i === 6 && "bg-canvas")}>
                  {d}
                </div>
              ))}
            </div>
            {weeks.map((week) => {
              const segs = layoutWeek(week.map((d) => d.key), items);
              const rowsUsed = Math.max(0, ...segs.map((s) => s.row + 1));
              return (
                <div key={week[0].key} className="relative grid grid-cols-7 border-b border-border" style={{ minHeight: mode === "week" ? 320 : Math.max(112, 30 + rowsUsed * (ROW_H + 4) + 8) }}>
                  {week.map((d) => (
                    <div key={d.key} className={cn("border-e border-border px-2 py-1 text-meta last:border-e-0", d.isDayOff && "bg-canvas", !d.inMonth && "text-fg-muted")}>
                      {d.key === today ? <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[11px] font-semibold text-white">{Number(d.key.slice(8))}</span> : <span className={cn(d.isDayOff && "text-fg-muted")}>{Number(d.key.slice(8))}</span>}
                      {d.isDayOff && <span className="float-end text-[10.5px] text-fg-muted">{t("dayOff")}</span>}
                    </div>
                  ))}
                  {segs.map((s) => {
                    const r = byKey.get(s.id)!;
                    const g = statusGroup(r.status as TaskStatus) ?? "done";
                    return (
                      <Link
                        key={s.id}
                        href={peekHref(r.key)}
                        title={`${r.key} · ${r.title}`}
                        className={cn("absolute flex items-center gap-1.5 overflow-hidden border-s-[3px] px-1.5 text-[12px] font-medium", BAR[g], !s.cutLeft && "rounded-s", !s.cutRight && "rounded-e")}
                        style={{ top: 28 + s.row * (ROW_H + 4), height: ROW_H, insetInlineStart: `calc(${(s.col / 7) * 100}% + 3px)`, width: `calc(${(s.span / 7) * 100}% - 6px)` }}
                      >
                        <span className="truncate">
                          {r.key} {r.title}
                        </span>
                        {r.assignee && <Avatar name={r.assignee.name} size={16} className="ms-auto" />}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <aside aria-label={t("noDeadline")} className="hidden w-[260px] shrink-0 overflow-y-auto border-s border-border lg:block">
          <h3 className="px-4 py-3 text-ui font-semibold">
            {t("noDeadline")} <span className="ms-1 font-normal text-fg-muted">{undated.length}</span>
          </h3>
          <p className="px-4 pb-2 text-meta text-fg-muted">{t("noDeadlineHint")}</p>
          <ul className="divide-y divide-border border-t border-border">
            {undated.map((r) => (
              <li key={r.key}>
                <Link href={peekHref(r.key)} className="block px-4 py-2.5 hover:bg-subtle">
                  <span className="flex items-center gap-2">
                    <PriorityIcon priority={(r.priority ?? r.suggestedPriority) as Priority | null} />
                    <span className="font-mono text-meta text-fg-secondary">{r.key}</span>
                    <span className="ms-auto">
                      <StatusLozenge status={r.status as TaskStatus} />
                    </span>
                  </span>
                  <span className="mt-1 block text-ui">{r.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
