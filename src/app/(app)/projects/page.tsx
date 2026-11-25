import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import { projectStats, sortByDeadline } from "@/domain/project-stats";
import { STATUS_GROUPS } from "@/domain/status-display";
import { OPEN_STATUSES } from "@/domain/workflow";
import type { TaskStatus } from "@/domain/types";
import { PROJECT_COLORS } from "@/lib/project-colors";

export const metadata = { title: "Projects" };

const HEALTH = {
  on_track: { dot: "var(--health-on-track)", pill: "bg-success-subtle text-success-strong" },
  at_risk: { dot: "var(--health-at-risk)", pill: "bg-warning-subtle text-warning-text" },
  off_track: { dot: "var(--health-off-track)", pill: "bg-danger-subtle text-danger-text" },
} as const;
const GROUP_COLOR = { request: "#8b5cf6", processing: "#f59e0b", stuck: "#e5484d", completed: "#2563eb", done: "#16a06a" } as const;
type Filter = "all" | "at_risk" | "mine" | "archived";

const dayLabel = (d: Date) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "Africa/Cairo" }).format(d);

/** Figma 4.1: totals on top, then one row per project with health, progress, tasks by status, owner, next due date and tags. */
export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const me = await requireMember();
  const t = await getTranslations("projects");
  const sp = await searchParams;
  const filter: Filter = (["at_risk", "mine", "archived"] as const).find((f) => f === sp.filter) ?? "all";
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 86_400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [all, byStatus, nextDue, doneMonth] = await Promise.all([
    db.project.findMany({
      where: { archivedAt: filter === "archived" ? { not: null } : null },
      orderBy: { position: "asc" },
      include: { abgLead: { select: { id: true, name: true } }, categories: { where: { archivedAt: null }, orderBy: { position: "asc" }, select: { name: true } } },
    }),
    db.task.groupBy({ by: ["projectId", "status"], where: { archivedAt: null }, _count: true }),
    db.task.groupBy({ by: ["projectId"], where: { archivedAt: null, status: { in: OPEN_STATUSES }, dueAt: { not: null } }, _min: { dueAt: true } }),
    db.task.count({ where: { archivedAt: null, status: "done", verifiedAt: { gte: monthStart } } }),
  ]);
  const [openTotal, dueWeek, late] = await Promise.all([
    db.task.count({ where: { archivedAt: null, status: { in: OPEN_STATUSES } } }),
    db.task.count({ where: { archivedAt: null, status: { in: OPEN_STATUSES }, dueAt: { gte: now, lte: weekEnd } } }),
    db.task.count({ where: { archivedAt: null, status: { in: ["triage", "needs_info", "planned", "in_progress", "reopened"] }, dueAt: { lt: now } } }),
  ]);

  const rows = all.map((p, i) => ({
    p,
    color: PROJECT_COLORS[i % PROJECT_COLORS.length],
    stats: projectStats(byStatus.filter((r) => r.projectId === p.id).map((r) => ({ status: r.status as TaskStatus, count: r._count }))),
    nextDue: nextDue.find((n) => n.projectId === p.id)?._min.dueAt ?? null,
    name: p.name,
  }));
  const atRisk = rows.filter((r) => r.p.health !== "on_track").length;
  const shown = sortByDeadline(rows.filter((r) => (filter === "at_risk" ? r.p.health !== "on_track" : filter === "mine" ? r.p.abgLeadId === me.id || r.p.vendoorLeadId === me.id : true)));
  const pills: Array<[Filter, string]> = [
    ["all", t("filterAll")],
    ["at_risk", `${t("filterAtRisk")} · ${atRisk}`],
    ["mine", t("filterMine")],
    ["archived", t("filterArchived")],
  ];

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="space-y-4 p-4 md:p-6">
        <nav aria-label={t("filters")} className="flex flex-wrap items-center gap-1.5">
          {pills.map(([f, label]) => (
            <Link key={f} href={f === "all" ? "/projects" : `/projects?filter=${f}`} aria-current={filter === f ? "page" : undefined} className={cn("h-8 rounded-full border px-3 text-[13px] font-semibold leading-8", filter === f ? "border-fg bg-fg text-white" : "border-border bg-surface text-fg-secondary hover:bg-subtle")}>
              {label}
            </Link>
          ))}
          <span className="ms-auto text-meta text-fg-muted">{t("sortDeadline")}</span>
        </nav>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label={t("kpiOpen")} value={openTotal} />
          <Kpi label={t("kpiDueWeek")} value={dueWeek} tone="text-warning-text" />
          <Kpi label={t("kpiLate")} value={late} tone="text-danger-text" />
          <Kpi label={t("kpiDoneMonth")} value={doneMonth} tone="text-success-strong" />
        </div>

        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full min-w-[860px] text-ui">
            <thead className="bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-fg-muted">
              <tr className="border-b border-border">
                {(["project", "health", "progress", "byStatus", "owner", "nextDue", "tags"] as const).map((c) => (
                  <th key={c} scope="col" className="px-4 py-2.5 text-start font-semibold">
                    {t(`col.${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-fg-secondary">
                    {t("none")}
                  </td>
                </tr>
              )}
              {shown.map(({ p, color, stats, nextDue: due }) => (
                <tr key={p.id} className="hover:bg-subtle">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${p.key.toLowerCase()}`} className="flex items-center gap-3">
                      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-[15px] font-bold text-white" style={{ background: color }}>
                        {p.name.charAt(0)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold hover:underline">{p.name}</span>
                        <span className="block truncate text-meta text-fg-muted">{p.description}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-meta font-semibold", HEALTH[p.health].pill)}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: HEALTH[p.health].dot }} aria-hidden />
                      {t(p.health)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="h-1 w-14 overflow-hidden rounded-full bg-subtle" aria-hidden>
                        <span className="block h-full rounded-full" style={{ width: `${stats.progress}%`, background: color }} />
                      </span>
                      <span className="tabular text-ui">{stats.progress}%</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex h-1.5 w-40 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={STATUS_GROUPS.map((g) => `${g} ${stats.byGroup[g]}`).join(", ")}>
                      {STATUS_GROUPS.map((g) => (stats.byGroup[g] ? <span key={g} style={{ background: GROUP_COLOR[g], flexGrow: stats.byGroup[g] }} className="min-w-px" /> : null))}
                    </div>
                    <div className="mt-1 text-meta text-fg-muted">{t("openDone", { open: stats.open, done: stats.done })}</div>
                  </td>
                  <td className="px-4 py-3">{p.abgLead ? <Avatar name={p.abgLead.name} size={26} /> : <span className="text-fg-muted">—</span>}</td>
                  <td className="whitespace-nowrap px-4 py-3">{due ? <span suppressHydrationWarning className={cn("tabular", due < now && "font-semibold text-danger-text")}>{dayLabel(due)}</span> : <span className="text-fg-muted">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1">
                      {p.categories.slice(0, 2).map((c) => (
                        <span key={c.name} className="whitespace-nowrap rounded-full bg-subtle px-2 py-0.5 text-meta text-fg-secondary">
                          {c.name}
                        </span>
                      ))}
                      {p.categories.length > 2 && <span className="text-meta text-fg-muted">+{p.categories.length - 2}</span>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="text-ui text-fg-secondary">{label}</div>
      <div className={cn("tabular mt-1 text-[30px] font-semibold leading-tight", tone)}>{value}</div>
    </div>
  );
}
