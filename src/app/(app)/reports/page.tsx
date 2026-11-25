import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { PageHeader } from "@/components/layout/page-header";
import { statusGroup } from "@/domain/status-display";
import type { TaskStatus } from "@/domain/types";

export const metadata = { title: "Reports" };

const GROUPS = ["request", "processing", "stuck", "completed", "done"] as const;
const COLORS: Record<(typeof GROUPS)[number], string> = { request: "#8b5cf6", processing: "#f59e0b", stuck: "#e5484d", completed: "#2563eb", done: "#16a06a" };

/** Month overview. The weekly report (Saturday to Thursday) builds on the same numbers. */
export default async function ReportsPage() {
  await requireMember();
  const t = await getTranslations("reports");
  const ts = await getTranslations("statusGroup");
  const grouped = await db.task.groupBy({ by: ["status"], where: { archivedAt: null }, _count: true });
  const counts: Record<string, number> = Object.fromEntries(GROUPS.map((g) => [g, 0]));
  for (const row of grouped) {
    const g = statusGroup(row.status as TaskStatus);
    if (g) counts[g] += row._count;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")}>
        <Link href="/reports/weekly" className="rounded-control border border-border px-3 py-1.5 text-ui font-medium hover:bg-subtle">
          {t("weekly")}
        </Link>
      </PageHeader>
      <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {GROUPS.map((g) => (
            <div key={g} className="rounded-card border border-border bg-surface p-4">
              <div className="flex items-center gap-2 text-ui text-fg-secondary">
                <span className="h-2 w-2 rounded-full" style={{ background: COLORS[g] }} />
                {ts(g)}
              </div>
              <div className="tabular mt-1 text-kpi font-semibold">{counts[g]}</div>
            </div>
          ))}
        </div>
        <div className="rounded-card border border-border bg-surface p-4">
          <h2 className="text-ui font-semibold">{t("overall")}</h2>
          <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full">
            {GROUPS.map((g) => (
              <span key={g} style={{ background: COLORS[g], flexGrow: counts[g] }} className="min-w-px" />
            ))}
          </div>
          <p className="mt-2 text-meta text-fg-muted">{t("tasks", { count: total })}</p>
        </div>
      </div>
    </>
  );
}
