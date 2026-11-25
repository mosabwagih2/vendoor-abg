import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { decorate, taskRowSelect } from "@/server/queries";
import { ReleaseDetail } from "./release-detail";

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }) {
  return { title: (await params).number };
}

/** FR-11.3: notes and the task list with verification state; tasks reopened after this release are flagged "Regressed". */
export default async function ReleasePage({ params }: { params: Promise<{ number: string }> }) {
  await requireMember();
  const { number } = await params;
  const t = await getTranslations("releases");
  const r = await db.release.findUnique({ where: { number: decodeURIComponent(number) }, include: { tasks: true, createdBy: { select: { name: true } }, deployedBy: { select: { name: true } } } });
  if (!r) notFound();
  const ids = r.tasks.map((x) => x.taskId);
  const rows = await decorate(await db.task.findMany({ where: { id: { in: ids } }, select: taskRowSelect }));
  const regressedSpans = r.releasedAt
    ? await db.taskStatusSpan.findMany({ where: { taskId: { in: ids }, status: "reopened", enteredAt: { gt: r.releasedAt } }, select: { taskId: true } })
    : [];
  const regressed = new Set(regressedSpans.map((s) => s.taskId));
  return (
    <ReleaseDetail
      title={r.state === "upcoming" ? t("upcoming") : r.number}
      release={{ id: r.id, number: r.number, state: r.state, type: r.type, releasedAt: r.releasedAt?.toISOString() ?? null, targetDate: r.targetDate?.toISOString() ?? null, notes: r.notes, createdBy: r.createdBy.name, deployedBy: r.deployedBy?.name ?? null, rolledBackAt: r.rolledBackAt?.toISOString() ?? null, rollbackReason: r.rollbackReason }}
      rows={rows}
      regressed={[...regressed]}
    />
  );
}
