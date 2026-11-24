import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { PageHeader } from "@/components/layout/page-header";
import { OPEN_STATUSES } from "@/domain/workflow";

export const metadata = { title: "Projects" };

const HEALTH_COLOR = { on_track: "var(--health-on-track)", at_risk: "var(--health-at-risk)", off_track: "var(--health-off-track)" } as const;

/** Phase 1: a simple list (FR-8.1 subset). Full project pages and updates come in Phase 2. */
export default async function ProjectsPage() {
  await requireMember();
  const t = await getTranslations("projects");
  const now = new Date();
  const projects = await db.project.findMany({
    where: { archivedAt: null },
    orderBy: { position: "asc" },
    include: { vendoorLead: { select: { name: true } }, abgLead: { select: { name: true } } },
  });
  const open = await db.task.groupBy({ by: ["projectId"], where: { archivedAt: null, status: { in: OPEN_STATUSES } }, _count: true });
  const overdue = await db.task.groupBy({ by: ["projectId"], where: { archivedAt: null, status: { in: ["triage", "needs_info", "planned", "in_progress", "reopened"] }, dueAt: { lt: now } }, _count: true });
  const count = (arr: typeof open, id: string) => arr.find((x) => x.projectId === id)?._count ?? 0;
  return (
    <div>
      <PageHeader title={t("title")} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-ui">
          <thead className="bg-subtle text-meta text-fg-secondary">
            <tr className="border-b border-border">
              <th scope="col" className="px-4 py-2 text-start font-medium">{t("title")}</th>
              <th scope="col" className="px-2 py-2 text-start font-medium">{t("health")}</th>
              <th scope="col" className="px-2 py-2 text-start font-medium">{t("vendoorLead")}</th>
              <th scope="col" className="px-2 py-2 text-start font-medium">{t("abgLead")}</th>
              <th scope="col" className="px-2 py-2 text-end font-medium">{t("openTasks")}</th>
              <th scope="col" className="px-4 py-2 text-end font-medium">{t("overdue")}</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-border hover:bg-subtle">
                <td className="px-4 py-2">
                  <Link href={`/projects/${p.key.toLowerCase()}`} className="hover:underline">
                    <span className="me-2 font-mono text-[12px] text-fg-secondary">{p.key}</span>
                    {p.name}
                  </Link>
                </td>
                <td className="px-2 py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: HEALTH_COLOR[p.health] }} aria-hidden />
                    {t(p.health)}
                  </span>
                </td>
                <td className="px-2 py-2 text-fg-secondary">{p.vendoorLead?.name ?? "—"}</td>
                <td className="px-2 py-2 text-fg-secondary">{p.abgLead?.name ?? "—"}</td>
                <td className="tabular px-2 py-2 text-end">
                  <Link href={`/tasks?project=${p.key}`} className="hover:underline">
                    {count(open, p.id)}
                  </Link>
                </td>
                <td className="tabular px-4 py-2 text-end">
                  <Link href={`/tasks?project=${p.key}&due=overdue`} className={count(overdue, p.id) ? "font-medium text-danger hover:underline" : "text-fg-muted"}>
                    {count(overdue, p.id)}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
