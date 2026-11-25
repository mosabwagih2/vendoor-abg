import { getTranslations } from "next-intl/server";
import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { decorate, taskRowSelect, waitingOnMe } from "@/server/queries";
import { activityFeed } from "@/server/activity-feed";
import { greetingKey } from "@/lib/format";
import { HomeView } from "./home-view";
import { AbgDashboard } from "./abg-dashboard";
import { loadDashboard } from "@/server/dashboard";

export const metadata = { title: "Home" };

export default async function HomePage() {
  const me = await requireMember();
  const t = await getTranslations("home");
  const now = new Date();
  if (me.side === "abg") {
    const dateLine = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", timeZone: "Africa/Cairo" }).format(now);
    return <AbgDashboard data={await loadDashboard()} greeting={t(greetingKey(), { name: me.name.replace(/^Eng\.\s*/, "").split(" ")[0] })} dateLine={dateLine} />;
  }
  const [waiting, overdueRaw, inProgress, lastRelease, upcoming, feed] = await Promise.all([
    waitingOnMe(me),
    db.task.findMany({
      where: {
        archivedAt: null,
        status: { in: ["triage", "needs_info", "planned", "in_progress", "reopened"] },
        OR: [{ dueAt: { lt: now } }, { status: "triage", slaFirstResponseDueAt: { lt: now } }, { slaResolutionDueAt: { lt: now }, status: { in: ["planned", "in_progress", "reopened"] } }],
        ...(me.role === "requester" ? { requesterId: me.id } : me.role === "abg_member" ? { OR: [{ assigneeId: me.id }, { status: "triage" }] } : {}),
      },
      select: taskRowSelect,
      take: 50,
    }),
    db.task.count({ where: { archivedAt: null, status: { in: ["in_progress", "reopened", "planned"] } } }),
    db.release.findFirst({
      where: { state: "released", archivedAt: null },
      orderBy: { releasedAt: "desc" },
      include: { tasks: { include: { task: { select: { status: true, reopenCount: true } } } } },
    }),
    db.release.findFirst({ where: { state: "upcoming", archivedAt: null, targetDate: { gte: now } }, orderBy: { targetDate: "asc" }, include: { _count: { select: { tasks: true } } } }),
    activityFeed(me, {}, 15),
  ]);
  const abgWork = await decorate(
    await db.task.findMany({ where: { archivedAt: null, status: { in: ["in_progress", "reopened", "planned"] } }, select: taskRowSelect, orderBy: [{ updatedAt: "desc" }], take: 5 }),
  );
  const overdue = (await decorate(overdueRaw))
    .filter((r) => r.isOverdue || r.sla?.state === "breached")
    .sort((a, b) => (a.dueAt ?? a.sla?.dueAt ?? "").localeCompare(b.dueAt ?? b.sla?.dueAt ?? ""));

  const counts = lastRelease
    ? {
        verified: lastRelease.tasks.filter((x) => x.task.status === "done").length,
        pending: lastRelease.tasks.filter((x) => x.task.status === "shipped").length,
        reopened: lastRelease.tasks.filter((x) => ["reopened", "in_progress"].includes(x.task.status)).length,
      }
    : null;

  return (
    <HomeView
      greeting={t(greetingKey(), { name: me.name.replace(/^Eng\.\s*/, "").split(" ")[0] })}
      summary={{ waiting: waiting.length, progress: inProgress, overdue: overdue.length }}
      abgWork={abgWork}
      waiting={waiting}
      overdue={overdue}
      lastRelease={lastRelease && counts ? { number: lastRelease.number, releasedAt: lastRelease.releasedAt!.toISOString(), ...counts } : null}
      upcoming={upcoming?.targetDate ? { date: upcoming.targetDate.toISOString(), count: upcoming._count.tasks } : null}
      feed={feed}
    />
  );
}
