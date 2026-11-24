import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { membersLite, projectsLite } from "@/server/queries";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMember();
  const [unread, waiting, triage, projects, members, incident, upcoming] = await Promise.all([
    db.notification.count({ where: { memberId: me.id, channel: "in_app", readAt: null } }),
    me.side === "vendoor"
      ? db.task.count({ where: { archivedAt: null, status: { in: ["needs_info", "shipped"] }, ...(me.role === "requester" ? { requesterId: me.id } : {}) } })
      : db.task.count({ where: { archivedAt: null, OR: [{ status: "triage" }, { status: { in: ["planned", "in_progress", "reopened"] }, assigneeId: me.id }] } }),
    db.task.count({ where: { archivedAt: null, status: "triage" } }),
    projectsLite(),
    membersLite(),
    db.incident.findFirst({ where: { state: { not: "resolved" }, archivedAt: null }, orderBy: { startedAt: "desc" } }),
    db.release.findMany({ where: { state: "upcoming", archivedAt: null }, select: { id: true, number: true, targetDate: true }, orderBy: { targetDate: "asc" } }),
  ]);
  return (
    <AppShell
      me={me}
      counts={{ unread, waiting, triage }}
      projects={projects}
      members={members.map((m) => ({ id: m.id, name: m.name, handle: m.handle, role: m.role, side: m.team.side === "delivery" ? "abg" : "vendoor" }))}
      upcoming={upcoming.map((r) => ({ id: r.id, number: r.targetDate ? `Upcoming ${r.targetDate.toISOString().slice(0, 10)}` : r.number }))}
      incident={incident ? { id: incident.id, number: incident.number, title: incident.title, startedAt: incident.startedAt.toISOString() } : null}
    >
      {children}
    </AppShell>
  );
}
