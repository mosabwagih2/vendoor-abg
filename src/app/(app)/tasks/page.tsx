import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { listTasks } from "@/server/queries";
import { loadTaskDetail } from "@/server/task-detail";
import { parseFilters } from "@/lib/filters";
import { projectStats } from "@/domain/project-stats";
import type { TaskStatus } from "@/domain/types";
import { TasksView } from "./tasks-view";

export const metadata = { title: "Tasks" };

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMember();
  const raw = await searchParams;
  const sp = new URLSearchParams(Object.entries(raw).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : v !== undefined ? [[k, v]] : [])));
  const { filters, display } = parseFilters(sp);
  const peekKey = sp.get("peek");
  const wantsTimeline = display.view === "timeline";
  const [rows, views, peek, byStatus, projects] = await Promise.all([
    listTasks(filters, display, me),
    db.savedView.findMany({ where: { archivedAt: null, OR: [{ ownerId: me.id }, { isShared: true }] }, orderBy: [{ isShared: "desc" }, { position: "asc" }, { createdAt: "asc" }] }),
    peekKey ? loadTaskDetail(peekKey, me) : null,
    wantsTimeline ? db.task.groupBy({ by: ["projectId", "status"], where: { archivedAt: null }, _count: true }) : [],
    wantsTimeline ? db.project.findMany({ where: { archivedAt: null }, select: { id: true, key: true, health: true } }) : [],
  ]);
  const projectInfo = {
    progress: Object.fromEntries(projects.map((p) => [p.key, projectStats(byStatus.filter((r) => r.projectId === p.id).map((r) => ({ status: r.status as TaskStatus, count: r._count }))).progress])),
    health: Object.fromEntries(projects.map((p) => [p.key, p.health])),
  };
  return (
    <TasksView
      rows={rows}
      filters={filters}
      display={display}
      query={(() => {
        const q = new URLSearchParams(sp);
        q.delete("peek");
        return q.toString();
      })()}
      savedViews={views.map((v) => ({ id: v.id, name: v.name, query: v.query, shared: v.isShared, mine: v.ownerId === me.id }))}
      peek={peek}
      projectInfo={projectInfo}
    />
  );
}
