import { getTranslations } from "next-intl/server";
import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { nextReleaseNumber } from "@/server/services/releases";
import { ReleasesView } from "./releases-view";

export const metadata = { title: "Releases" };

export default async function ReleasesPage() {
  const me = await requireMember();
  const t = await getTranslations("releases");
  const [releases, candidates, number] = await Promise.all([
    db.release.findMany({
      where: { archivedAt: null },
      // nulls as PostgreSQL ordered them (MySQL puts NULL first on asc and last on desc).
      orderBy: [{ state: "desc" }, { releasedAt: { sort: "desc", nulls: "first" } }, { targetDate: { sort: "asc", nulls: "last" } }],
      include: { tasks: { include: { task: { select: { status: true, statusChangedAt: true } } } } },
    }),
    me.side === "abg"
      ? db.task.findMany({ where: { archivedAt: null, status: { in: ["in_progress", "shipped", "reopened", "planned"] } }, select: { id: true, key: true, title: true, status: true }, orderBy: [{ status: "asc" }, { updatedAt: "desc" }] })
      : [],
    nextReleaseNumber(),
  ]);
  return (
    <ReleasesView
      title={t("title")}
      nextNumber={number}
      candidates={candidates}
      releases={releases.map((r) => ({
        id: r.id,
        number: r.number,
        state: r.state,
        type: r.type,
        releasedAt: r.releasedAt?.toISOString() ?? null,
        targetDate: r.targetDate?.toISOString() ?? null,
        total: r.tasks.length,
        verified: r.tasks.filter((x) => x.task.status === "done").length,
        pending: r.tasks.filter((x) => x.task.status === "shipped").length,
        reopened: r.tasks.filter((x) => ["reopened", "in_progress"].includes(x.task.status) && r.releasedAt && x.task.statusChangedAt > r.releasedAt).length,
      }))}
    />
  );
}
