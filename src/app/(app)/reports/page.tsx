import { getTranslations } from "next-intl/server";
import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { getWorkspaceConfig } from "@/server/calendar";
import { loadReport } from "@/server/report";
import { localDateKey } from "@/domain/sla";
import { parseRangeKind, rangeFor, rangeShortName, rangeTitle, shiftRange } from "@/domain/report-range";
import { ReportsView } from "./reports-view";

export const metadata = { title: "Reports" };

/** Figma 4.3: the month and year report. Weekly report has its own tab. */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ kind?: string; date?: string; compare?: string; project?: string; assignee?: string }> }) {
  await requireMember();
  const sp = await searchParams;
  const t = await getTranslations("reports");
  const cfg = await getWorkspaceConfig();
  const today = localDateKey(new Date(), cfg.calendar.tz);
  const kind = parseRangeKind(sp.kind);
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : today;
  const range = rangeFor(kind, anchor);
  const compare = sp.compare !== "0";
  const filters = { project: sp.project || undefined, assignee: sp.assignee || undefined };
  const [data, projects, people] = await Promise.all([
    loadReport(range, filters),
    db.project.findMany({ where: { archivedAt: null }, orderBy: { position: "asc" }, select: { key: true, name: true } }),
    db.member.findMany({ where: { status: { not: "deactivated" }, team: { side: "delivery" } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const prev = shiftRange(range, -1);
  const next = shiftRange(range, 1);
  return (
    <ReportsView
      title={t("title")}
      kind={kind}
      rangeTitle={rangeTitle(range)}
      prevName={rangeShortName(prev)}
      prevDate={prev.start}
      nextDate={next.start}
      canNext={next.start <= today}
      compare={compare}
      filters={filters}
      projects={projects}
      people={people}
      data={data}
    />
  );
}
