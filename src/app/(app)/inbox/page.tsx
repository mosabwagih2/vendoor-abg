import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { loadTaskDetail } from "@/server/task-detail";
import { InboxView } from "./inbox-view";

export const metadata = { title: "Inbox" };

/** PRD 6.2 (Phase 1 basic): list on the left, task on the right; unread dot; mark read on open. */
export default async function InboxPage({ searchParams }: { searchParams: Promise<{ filter?: string; n?: string }> }) {
  const me = await requireMember();
  const sp = await searchParams;
  const filter = sp.filter ?? "all";
  const rows = await db.notification.findMany({
    where: {
      memberId: me.id,
      channel: "in_app",
      ...(filter === "unread" ? { readAt: null } : {}),
      ...(filter === "mentions" ? { kind: "task.mentioned" } : {}),
      ...(filter === "waiting" ? { kind: { in: ["task.needs_info", "task.shipped", "task.reopened", "task.new_request", "task.status_request", "task.verify_reminder", "task.assigned"] } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { event: { include: { actor: { select: { name: true } } } } },
  });
  const taskIds = [...new Set(rows.map((r) => r.taskId).filter((x): x is string => !!x))];
  const tasks = await db.task.findMany({ where: { id: { in: taskIds } }, select: { id: true, key: true, title: true, status: true } });
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const selected = rows.find((r) => r.id === sp.n) ?? null;
  if (selected && !selected.readAt) await db.notification.update({ where: { id: selected.id }, data: { readAt: new Date() } });
  const selTask = selected?.taskId ? byId.get(selected.taskId) : null;
  const detail = selTask ? await loadTaskDetail(selTask.key, me) : null;
  return (
    <InboxView
      filter={filter}
      items={rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        read: !!r.readAt || r.id === selected?.id,
        at: r.createdAt.toISOString(),
        actor: r.event.actor?.name ?? null,
        task: r.taskId ? (byId.get(r.taskId) ?? null) : null,
      }))}
      selectedId={selected?.id ?? null}
      detail={detail}
    />
  );
}
