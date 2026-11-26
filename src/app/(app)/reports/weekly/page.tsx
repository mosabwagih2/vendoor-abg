import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Minus } from "lucide-react";
import { requireMember } from "@/server/session";
import { SendReportDialog } from "./send-report-dialog";
import { weekRangeLabel, weekTitle } from "@/domain/weekly-text";
import { PageHeader } from "@/components/layout/page-header";
import { weeklyReport, type WeekTotals } from "@/server/weekly-report";
import { getWorkspaceConfig } from "@/server/calendar";
import { localDateKey } from "@/domain/sla";
import { deltaVs, nextWeek, previousWeek, weekStart } from "@/domain/week";
import { cn } from "@/lib/cn";
import { formatExact } from "@/lib/format";

export const metadata = { title: "Weekly report" };

const CARDS: Array<keyof WeekTotals> = ["requested", "completed", "done", "released", "incidents"];
/** For these cards, going up is bad news. */
const LOWER_IS_BETTER = new Set<keyof WeekTotals>(["incidents"]);

/** Weekly report: Saturday to Thursday, Friday off. Every number is computed from tasks, releases and incidents. */
export default async function WeeklyReportPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  await requireMember();
  const t = await getTranslations("weekly");
  const { week } = await searchParams;
  const cfg = await getWorkspaceConfig();
  const today = localDateKey(new Date(), cfg.calendar.tz);
  const start = weekStart(/^\d{4}-\d{2}-\d{2}$/.test(week ?? "") ? week! : today);
  const r = await weeklyReport(start);
  const isCurrent = start === weekStart(today);
  const peak = Math.max(1, ...r.days.map((d) => Math.max(d.requested, d.completed)));
  const dayName = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" });
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("range", { from: r.week.start, to: r.week.end })}>
        <div role="tablist" className="inline-flex rounded-control border border-border bg-subtle p-0.5">
          <span role="tab" aria-selected className="rounded bg-surface px-3 py-1 text-ui font-medium shadow-sm">
            {t("title")}
          </span>
          <Link role="tab" aria-selected={false} href="/reports" className="rounded px-3 py-1 text-ui text-fg-secondary">
            {t("monthTab")}
          </Link>
        </div>
        <nav aria-label={t("weekNav")} className="flex items-center gap-1">
          <Link href={`/reports/weekly?week=${previousWeek(start)}`} aria-label={t("prev")} className="grid h-8 w-8 place-items-center rounded-control hover:bg-subtle">
            <ChevronLeft size={16} aria-hidden />
          </Link>
          <Link href="/reports/weekly" className={cn("rounded-control px-2.5 py-1 text-ui", isCurrent ? "bg-subtle font-medium" : "hover:bg-subtle")}>
            {t("thisWeek")}
          </Link>
          <Link href={`/reports/weekly?week=${nextWeek(start)}`} aria-label={t("next")} aria-disabled={isCurrent} className={cn("grid h-8 w-8 place-items-center rounded-control hover:bg-subtle", isCurrent && "pointer-events-none opacity-40")}>
            <ChevronRight size={16} aria-hidden />
          </Link>
        </nav>
        <SendReportDialog week={start} title={weekTitle(start)} range={weekRangeLabel(r.week.start, r.week.end)} />
      </PageHeader>
      <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CARDS.map((k) => {
            const d = deltaVs(r.totals[k], r.previous[k]);
            const good = d.direction === "same" ? null : (d.direction === "up") !== LOWER_IS_BETTER.has(k);
            const Icon = d.direction === "up" ? ArrowUp : d.direction === "down" ? ArrowDown : Minus;
            return (
              <div key={k} className="rounded-card border border-border bg-surface p-4">
                <div className="text-ui text-fg-secondary">{t(`card.${k}`)}</div>
                <div className="tabular mt-1 text-kpi font-semibold">{r.totals[k]}</div>
                <div className={cn("mt-1 flex items-center gap-1 text-meta", good === null ? "text-fg-muted" : good ? "text-success-strong" : "text-danger-text")}>
                  <Icon size={12} aria-hidden />
                  {d.direction === "same" ? t("same") : t("vsLast", { diff: `${d.diff > 0 ? "+" : ""}${d.diff}` })}
                </div>
              </div>
            );
          })}
        </div>

        <section className="rounded-card border border-border bg-surface p-4" aria-label={t("byDay")}>
          <div className="flex items-center gap-4">
            <h2 className="text-ui font-semibold">{t("byDay")}</h2>
            <Legend color="bg-[#8b5cf6]" label={t("card.requested")} />
            <Legend color="bg-[#2563eb]" label={t("card.completed")} />
          </div>
          <div className="mt-4 grid grid-cols-6 gap-2">
            {r.days.map((d) => (
              <div key={d.key} className="flex flex-col items-center gap-2">
                <div className="flex h-28 items-end gap-1" role="img" aria-label={`${d.key}: ${d.requested} / ${d.completed}`}>
                  <Bar value={d.requested} peak={peak} className="bg-[#8b5cf6]" />
                  <Bar value={d.completed} peak={peak} className="bg-[#2563eb]" />
                </div>
                <span className="text-meta text-fg-muted">{dayName.format(new Date(`${d.key}T00:00:00Z`))}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-meta text-fg-muted">{t("fridayOff")}</p>
        </section>

        <section className="rounded-card border border-border bg-surface p-4" aria-label={t("releases")}>
          <h2 className="text-ui font-semibold">{t("releases")}</h2>
          {r.releases.length === 0 ? (
            <p className="mt-2 text-ui text-fg-secondary">{t("noReleases")}</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {r.releases.map((x) => (
                <li key={x.number} className="flex items-center gap-3 py-2 text-ui">
                  <Link href={`/releases/${x.number}`} className="font-mono text-meta text-accent hover:underline">
                    {x.number}
                  </Link>
                  <span className="text-fg-secondary">{t("tasksShipped", { count: x.taskCount })}</span>
                  <span suppressHydrationWarning className="ms-auto text-meta text-fg-muted">{formatExact(x.releasedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-meta text-fg-secondary">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {label}
    </span>
  );
}

function Bar({ value, peak, className }: { value: number; peak: number; className: string }) {
  return <div className={cn("w-4 rounded-t", className)} style={{ height: `${Math.max(value ? 6 : 2, (value / peak) * 100)}%`, opacity: value ? 1 : 0.2 }} />;
}
