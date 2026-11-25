"use client";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Sun } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { PriorityIcon } from "@/components/icons/priority-icon";
import type { TaskRowData } from "@/components/task/task-row";
import { cn } from "@/lib/cn";
import { PROJECT_COLORS } from "@/lib/project-colors";
import { localDateKey } from "@/domain/sla";
import { addDays } from "@/domain/week";
import { barBox, daysBetween, fridayOffsets, monthMarks, visibleRange, type Span, type TimelineScale } from "@/domain/timeline";
import { statusGroup, type StatusGroup } from "@/domain/status-display";
import type { Priority, TaskStatus } from "@/domain/types";

const TZ = "Africa/Cairo";
const LEFT = 260;
const GROUP_COLOR: Record<StatusGroup, string> = { request: "#8b5cf6", processing: "#f59e0b", stuck: "#e5484d", completed: "#2563eb", done: "#16a06a" };

interface ProjectRow {
  key: string;
  name: string;
  color: string;
  span: Span;
  progress: number;
  health: string;
  lead: string | null;
  tasks: Array<{ row: TaskRowData; span: Span }>;
}

/** Figma 3.4: one bar per project with its progress, expandable to the project's tasks. Today is a blue line, Fridays are shaded. */
export function TimelineView({ rows, progress, health, peekHref }: { rows: TaskRowData[]; progress: Record<string, number>; health: Record<string, string>; peekHref: (key: string) => string }) {
  const t = useTranslations("tasks.timeline");
  const th = useTranslations("projects");
  const [scale, setScale] = useState<TimelineScale>("months");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const today = localDateKey(new Date(), TZ);

  const byProject = new Map<string, ProjectRow>();
  rows.forEach((r) => {
    const start = localDateKey(new Date(r.createdAt), TZ);
    const due = r.dueAt ? localDateKey(new Date(r.dueAt), TZ) : addDays(start, 7);
    const span = { start: start <= due ? start : due, end: due };
    const cur = byProject.get(r.project.key);
    if (cur) {
      cur.tasks.push({ row: r, span });
      if (span.start < cur.span.start) cur.span.start = span.start;
      if (span.end > cur.span.end) cur.span.end = span.end;
    } else {
      byProject.set(r.project.key, { key: r.project.key, name: r.project.name, color: "", span: { ...span }, progress: progress[r.project.key] ?? 0, health: health[r.project.key] ?? "on_track", lead: r.assignee?.name ?? null, tasks: [{ row: r, span }] });
    }
  });
  const projects = [...byProject.values()].sort((a, b) => a.name.localeCompare(b.name)).map((p, i) => ({ ...p, color: PROJECT_COLORS[i % PROJECT_COLORS.length] }));
  const range = visibleRange(projects.map((p) => p.span), today);
  const width = barBox(range, range, scale).width;
  const marks = monthMarks(range, scale);
  const fridays = fridayOffsets(range, scale);
  const todayLeft = barBox(range, { start: today, end: today }, scale).left + 0;
  const toggle = (k: string) => setOpen((s) => new Set(s.has(k) ? [...s].filter((x) => x !== k) : [...s, k]));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <div className="inline-flex rounded-control bg-subtle p-0.5" role="group" aria-label={t("scale")}>
          {(["weeks", "months", "quarters"] as const).map((s) => (
            <button key={s} type="button" aria-pressed={scale === s} onClick={() => setScale(s)} className={cn("rounded px-3 py-1 text-ui", scale === s ? "bg-surface font-medium shadow-sm" : "text-fg-secondary")}>
              {t(s)}
            </button>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-2.5 py-1 text-meta text-fg-secondary">
          <Sun size={12} aria-hidden />
          {t("fridays")}
        </span>
        <span className="ms-auto text-meta text-fg-muted">{t("hint")}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div style={{ width: LEFT + width }} className="relative">
          <div className="sticky top-0 z-10 flex border-b border-border bg-surface">
            <div style={{ width: LEFT }} className="sticky start-0 z-20 shrink-0 border-e border-border bg-surface px-4 py-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
              {t("project")}
            </div>
            <div className="relative h-9" style={{ width }}>
              {marks.map((m) => (
                <span key={m.label + m.left} className="absolute top-0 flex h-full items-center border-s border-border px-2.5 text-ui font-medium" style={{ insetInlineStart: m.left, width: m.width }}>
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div aria-hidden className="pointer-events-none absolute inset-y-0" style={{ insetInlineStart: LEFT, width }}>
              {fridays.map((x) => (
                <span key={x} className="absolute inset-y-0 bg-canvas" style={{ insetInlineStart: x, width: 9 }} />
              ))}
              <span className="absolute inset-y-0 w-px bg-accent" style={{ insetInlineStart: todayLeft }}>
                <span className="absolute -top-0.5 -translate-x-1/2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">{t("today")}</span>
              </span>
            </div>

            {projects.map((p) => {
              const box = barBox(range, p.span, scale);
              const isOpen = open.has(p.key);
              const done = Math.round((box.width * p.progress) / 100);
              return (
                <div key={p.key} className="border-b border-border">
                  <div className="relative flex h-[46px]">
                    <button type="button" aria-expanded={isOpen} onClick={() => toggle(p.key)} style={{ width: LEFT }} className="sticky start-0 z-10 flex shrink-0 items-center gap-2 border-e border-border bg-surface px-3 text-start">
                      {isOpen ? <ChevronDown size={14} className="text-fg-muted" aria-hidden /> : <ChevronRight size={14} className="text-fg-muted" aria-hidden />}
                      <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[12px] font-bold text-white" style={{ background: p.color }}>
                        {p.name.charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-ui font-semibold leading-tight">{p.name}</span>
                        <span className={cn("block text-[11px] leading-tight", p.health === "on_track" ? "text-success-strong" : p.health === "at_risk" ? "text-warning-text" : "text-danger-text")}>{th(p.health as "on_track")}</span>
                      </span>
                      {p.lead && <Avatar name={p.lead} size={22} />}
                    </button>
                    <div className="relative" style={{ width }}>
                      <div className="absolute top-3 flex h-[22px] items-center overflow-hidden rounded-md text-[12px] font-semibold" style={{ insetInlineStart: box.left, width: box.width, background: `${p.color}33` }}>
                        <span className="absolute inset-y-0 start-0 rounded-md" style={{ width: done, background: p.color }} />
                        <span className="relative truncate px-2 text-white mix-blend-normal" style={{ color: p.progress > 30 ? "#fff" : "var(--text-primary)" }}>
                          {p.name} · {p.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                  {isOpen &&
                    p.tasks.map(({ row, span }) => {
                      const b = barBox(range, span, scale);
                      const g = statusGroup(row.status as TaskStatus) ?? "done";
                      return (
                        <div key={row.key} className="relative flex h-8 border-t border-border/60 bg-canvas/50">
                          <Link href={peekHref(row.key)} style={{ width: LEFT }} className="sticky start-0 z-10 flex shrink-0 items-center gap-2 border-e border-border bg-canvas ps-9 pe-3 text-meta hover:bg-subtle">
                            <PriorityIcon priority={(row.priority ?? row.suggestedPriority) as Priority | null} />
                            <span className="font-mono text-fg-secondary">{row.key}</span>
                            <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: GROUP_COLOR[g] }} />
                            <span className="truncate text-fg-muted">{row.title}</span>
                          </Link>
                          <div className="relative" style={{ width }}>
                            <Link href={peekHref(row.key)} aria-label={`${row.key} ${row.title}`} className="absolute top-2.5 h-3 rounded-full" style={{ insetInlineStart: b.left, width: b.width, background: `${GROUP_COLOR[g]}55`, outline: `2px solid ${GROUP_COLOR[g]}`, outlineOffset: -2 }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

void daysBetween;
