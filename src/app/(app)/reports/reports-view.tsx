"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/cn";
import { formatCountDelta, formatDays, formatDelta, formatMinutes } from "@/domain/kpi-format";
import { RANGE_KINDS, type RangeKind } from "@/domain/report-range";
import { STATUS_GROUPS } from "@/domain/status-display";
import { PROJECT_COLORS } from "@/lib/project-colors";
import type { ReportData } from "@/server/report";

const COLOR = { request: "#8b5cf6", processing: "#f59e0b", stuck: "#e5484d", completed: "#2563eb", done: "#16a06a" } as const;

interface Props {
  title: string;
  kind: RangeKind;
  rangeTitle: string;
  prevName: string;
  prevDate: string;
  nextDate: string;
  canNext: boolean;
  compare: boolean;
  filters: { project?: string; assignee?: string };
  projects: Array<{ key: string; name: string }>;
  people: Array<{ id: string; name: string }>;
  data: ReportData;
}

export function ReportsView({ title, kind, rangeTitle, prevName, prevDate, nextDate, canNext, compare, filters, projects, people, data }: Props) {
  const t = useTranslations("reports");
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();

  /** Changes one or more URL params and keeps the rest, so every view is a shareable link. */
  const link = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) v === null ? q.delete(k) : q.set(k, v);
    const s = q.toString();
    return s ? `${path}?${s}` : path;
  };

  const peak = Math.max(1, ...data.chart.flatMap((c) => [c.created, c.completed]));
  const totalNow = Object.values(data.now).reduce((a, b) => a + b, 0) || 1;
  const k = data.kpis;
  const p = data.previous;
  const cards: Array<{ id: string; label: string; value: string; delta: { text: string; direction: "up" | "down" | "same" } | null; lowerBetter?: boolean }> = [
    { id: "created", label: t("created"), value: String(k.created), delta: formatDelta(k.created, p.created) },
    { id: "completed", label: t("completed"), value: String(k.completed), delta: formatDelta(k.completed, p.completed) },
    { id: "first", label: t("firstResponse"), value: formatMinutes(k.firstResponseMin), delta: formatDelta(k.firstResponseMin, p.firstResponseMin), lowerBetter: true },
    { id: "resolution", label: t("resolutionTime"), value: formatDays(k.resolutionDays), delta: formatDelta(k.resolutionDays, p.resolutionDays), lowerBetter: true },
    { id: "reopened", label: t("reopened"), value: String(k.reopened), delta: formatCountDelta(k.reopened, p.reopened), lowerBetter: true },
  ];

  function exportCsv() {
    const rows = [["Project", "Created", "Done", "Progress %"], ...data.byProject.map((r) => [r.name, r.created, r.done, r.progress])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `report-${rangeTitle.replace(/\W+/g, "-")}.csv`;
    a.click();
  }

  return (
    <>
      <PageHeader title={title}>
        <div role="tablist" className="inline-flex rounded-control border border-border bg-subtle p-0.5">
          <Link role="tab" aria-selected={false} href="/reports/weekly" className="rounded px-3 py-1 text-ui text-fg-secondary">
            {t("tabWeekly")}
          </Link>
          <span role="tab" aria-selected className="rounded bg-surface px-3 py-1 text-ui font-medium shadow-sm">
            {t("tabMonth")}
          </span>
        </div>
        <div className="flex-1" />
        <button type="button" onClick={exportCsv} className="inline-flex h-8 items-center gap-1.5 rounded-control border border-border px-3 text-ui font-medium hover:bg-subtle">
          <Download size={14} aria-hidden />
          {t("export")}
        </button>
      </PageHeader>

      <div className="space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-control bg-subtle p-0.5" role="group" aria-label={t("period")}>
            {RANGE_KINDS.map((r) => (
              <Link key={r} href={link({ kind: r, date: null })} aria-current={kind === r ? "true" : undefined} className={cn("rounded px-3 py-1 text-ui", kind === r ? "bg-surface font-medium shadow-sm" : "text-fg-secondary")}>
                {t(`kind.${r}`)}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Link href={link({ date: prevDate })} aria-label={t("prev")} className="grid h-8 w-8 place-items-center rounded-control border border-border hover:bg-subtle">
              <ChevronLeft size={15} aria-hidden />
            </Link>
            <Link href={link({ date: nextDate })} aria-label={t("next")} aria-disabled={!canNext} className={cn("grid h-8 w-8 place-items-center rounded-control border border-border hover:bg-subtle", !canNext && "pointer-events-none opacity-40")}>
              <ChevronRight size={15} aria-hidden />
            </Link>
          </div>
          <span className="text-ui font-semibold">{rangeTitle}</span>
          <button type="button" role="switch" aria-checked={compare} onClick={() => router.push(link({ compare: compare ? "0" : null }))} className="inline-flex h-8 items-center gap-2 rounded-full border border-border px-3 text-ui">
            <span className={cn("relative h-4 w-7 rounded-full", compare ? "bg-accent" : "bg-border-strong")}>
              <span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all", compare ? "start-3.5" : "start-0.5")} />
            </span>
            {t("compareTo", { name: prevName })}
          </button>
          <div className="ms-auto flex gap-2">
            <select aria-label={t("project")} value={filters.project ?? ""} onChange={(e) => router.push(link({ project: e.target.value || null }))} className="h-8 rounded-full border border-border bg-surface px-3 text-ui">
              <option value="">{t("project")}</option>
              {projects.map((x) => (
                <option key={x.key} value={x.key}>
                  {x.name}
                </option>
              ))}
            </select>
            <select aria-label={t("assignee")} value={filters.assignee ?? ""} onChange={(e) => router.push(link({ assignee: e.target.value || null }))} className="h-8 rounded-full border border-border bg-surface px-3 text-ui">
              <option value="">{t("assignee")}</option>
              {people.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {cards.map((c) => {
            const good = !c.delta || c.delta.direction === "same" ? null : (c.delta.direction === "up") !== !!c.lowerBetter;
            return (
              <div key={c.id} className="rounded-card border border-border bg-surface p-4">
                <div className="text-ui text-fg-secondary">{c.label}</div>
                <div className="tabular mt-1 text-[28px] font-semibold leading-tight">{c.value}</div>
                {compare && c.delta && <span className={cn("mt-1.5 inline-block rounded px-1.5 py-0.5 text-meta font-semibold", good === null ? "bg-subtle text-fg-muted" : good ? "bg-success-subtle text-success-strong" : "bg-danger-subtle text-danger-text")}>{t("vs", { delta: c.delta.text, name: prevName })}</span>}
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <section className="rounded-card border border-border bg-surface p-4" aria-label={t("chart")}>
            <div className="flex items-center gap-3">
              <h2 className="text-ui font-semibold">{t("chart")}</h2>
              <span className="ms-auto flex items-center gap-1.5 text-meta text-fg-secondary"><i className="h-2 w-2 rounded-sm bg-[#2563eb]" />{t("created")}</span>
              <span className="flex items-center gap-1.5 text-meta text-fg-secondary"><i className="h-2 w-2 rounded-sm bg-[#16a06a]" />{t("completed")}</span>
            </div>
            <div className="mt-4 flex h-52 items-stretch gap-3 overflow-x-auto border-b border-border pb-0.5">
              {data.chart.map((c) => (
                <div key={c.label} className="flex min-w-6 flex-1 flex-col items-center justify-end gap-1" role="img" aria-label={`${c.label}: ${c.created} / ${c.completed}`}>
                  <div className="flex h-full w-full items-end justify-center gap-1">
                    <Bar value={c.created} peak={peak} color="#2563eb" />
                    <Bar value={c.completed} peak={peak} color="#16a06a" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-3">
              {data.chart.map((c) => (
                <span key={c.label} className="min-w-6 flex-1 text-center text-meta text-fg-muted">{c.label}</span>
              ))}
            </div>
          </section>

          <section className="rounded-card border border-border bg-surface p-4" aria-label={t("nowTitle")}>
            <h2 className="text-ui font-semibold">{t("nowTitle")}</h2>
            <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full">
              {STATUS_GROUPS.map((g) => (data.now[g] ? <span key={g} style={{ background: COLOR[g], flexGrow: data.now[g] }} /> : null))}
            </div>
            <ul className="mt-4 space-y-2.5">
              {STATUS_GROUPS.map((g) => (
                <li key={g} className="flex items-center gap-2 text-ui">
                  <i className="h-2 w-2 rounded-full" style={{ background: COLOR[g] }} />
                  <span className="flex-1 text-fg-secondary">{t(`group.${g}`)}</span>
                  <span className="tabular font-semibold">{data.now[g]}</span>
                  <span className="tabular w-10 text-end text-meta text-fg-muted">{Math.round((data.now[g] / totalNow) * 100)}%</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Table title={t("byProject")} head={[t("project"), t("created"), t("done"), t("progress")]}>
            {data.byProject.map((r, i) => (
              <tr key={r.key}>
                <td className="px-4 py-2.5">{r.name}</td>
                <td className="tabular px-2 py-2.5">{r.created}</td>
                <td className="tabular px-2 py-2.5">{r.done}</td>
                <td className="px-4 py-2.5">
                  <span className="block h-1.5 w-20 overflow-hidden rounded-full bg-subtle" aria-label={`${r.progress}%`}>
                    <span className="block h-full rounded-full" style={{ width: `${r.progress}%`, background: PROJECT_COLORS[i % PROJECT_COLORS.length] }} />
                  </span>
                </td>
              </tr>
            ))}
          </Table>
          <Table title={t("byPerson")} head={[t("person"), t("assigned"), t("done"), t("avgTime")]}>
            {data.byPerson.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    <Avatar name={r.name} size={22} />
                    {r.name}
                  </span>
                </td>
                <td className="tabular px-2 py-2.5">{r.assigned}</td>
                <td className="tabular px-2 py-2.5">{r.done}</td>
                <td className="tabular px-4 py-2.5 text-fg-secondary">{r.avgDays === null ? "—" : `${+r.avgDays.toFixed(1)} d`}</td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
    </>
  );
}

function Bar({ value, peak, color }: { value: number; peak: number; color: string }) {
  return (
    <div className="flex h-full w-4 flex-col items-center justify-end">
      {value > 0 && <span className="tabular mb-0.5 text-[11px] font-semibold">{value}</span>}
      <div className="w-full rounded-t" style={{ height: `${Math.max(value ? 4 : 1, (value / peak) * 85)}%`, background: color, opacity: value ? 1 : 0.2 }} />
    </div>
  );
}

function Table({ title, head, children }: { title: string; head: string[]; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface">
      <h2 className="px-4 py-3 text-ui font-semibold">{title}</h2>
      <table className="w-full text-ui">
        <thead className="bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-fg-muted">
          <tr>
            {head.map((h, i) => (
              <th key={h} scope="col" className={cn("py-2 text-start font-semibold", i === 0 || i === head.length - 1 ? "px-4" : "px-2")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </section>
  );
}
