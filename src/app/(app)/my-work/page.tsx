import { getTranslations } from "next-intl/server";
import type { Prisma } from "@/generated/prisma/client";
import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { decorate, taskRowSelect, waitingOnMe } from "@/server/queries";
import { MyWorkView } from "./my-work-view";

export const metadata = { title: "My tasks" };

const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);

/** PRD 6.3: Waiting on me, Requested by me (Vendoor) / Assigned to me (ABG), Following, Done (last 30 days). */
export default async function MyWorkPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await requireMember();
  const t = await getTranslations("myWork");
  const tab = (await searchParams).tab ?? "waiting";
  const since = daysAgo(30);
  const mineWhere: Prisma.TaskWhereInput = me.side === "vendoor" ? { requesterId: me.id } : { assigneeId: me.id };
  const where: Record<string, Prisma.TaskWhereInput> = {
    mine: { archivedAt: null, ...mineWhere, status: { notIn: ["done", "closed"] } },
    following: { archivedAt: null, followers: { some: { memberId: me.id, following: true } }, status: { notIn: ["done", "closed"] } },
    done: { archivedAt: null, OR: [mineWhere, { verifiedById: me.id }], status: "done", verifiedAt: { gte: since } },
  };
  const rows = tab === "waiting" ? await waitingOnMe(me) : await decorate(await db.task.findMany({ where: where[tab] ?? where.mine, select: taskRowSelect, orderBy: { updatedAt: "desc" }, take: 500 }));
  const needsMe = tab === "waiting" ? rows : await waitingOnMe(me);
  const tabs = [
    { id: "waiting", label: t("needsMe"), count: needsMe.length },
    { id: "mine", label: me.side === "vendoor" ? t("requestedByMe") : t("assignedToMe") },
    { id: "following", label: t("following") },
    { id: "done", label: t("done") },
  ];
  return <MyWorkView title={t("title")} subtitle={t("subtitle", { count: needsMe.length })} tabs={tabs} tab={tab} rows={rows} />;
}
