import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { listTasks } from "@/server/queries";
import { loadTaskDetail } from "@/server/task-detail";
import { parseFilters } from "@/lib/filters";
import { TasksView } from "./tasks-view";

export const metadata = { title: "Tasks" };

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMember();
  const raw = await searchParams;
  const sp = new URLSearchParams(Object.entries(raw).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : v !== undefined ? [[k, v]] : [])));
  const { filters, display } = parseFilters(sp);
  const peekKey = sp.get("peek");
  const [rows, views, peek] = await Promise.all([
    listTasks(filters, display, me),
    db.savedView.findMany({ where: { archivedAt: null, OR: [{ ownerId: me.id }, { isShared: true }] }, orderBy: [{ isShared: "desc" }, { position: "asc" }, { createdAt: "asc" }] }),
    peekKey ? loadTaskDetail(peekKey, me) : null,
  ]);
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
    />
  );
}
