import { getCurrentMember } from "@/server/session";
import { listTasks } from "@/server/queries";
import { parseFilters } from "@/lib/filters";
import { formatExact } from "@/lib/format";

/** FR-5.8: current view to CSV (same filters as the list). */
export async function GET(req: Request) {
  const me = await getCurrentMember();
  if (!me) return new Response("Unauthorized", { status: 401 });
  const { filters, display } = parseFilters(new URL(req.url).searchParams);
  const rows = await listTasks(filters, display, me, 10_000);
  const head = ["ID", "Title", "Project", "Type", "Status", "Priority", "Suggested priority", "Waiting on", "Assignee", "Requester", "Due (Cairo)", "Created (Cairo)", "Updated (Cairo)", "Occurrences", "Reopen count", "SLA"];
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Neutralise spreadsheet formulas (CSV injection).
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const lines = [head.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.key,
        r.title,
        r.project.key,
        r.type,
        r.status,
        r.priority ?? "",
        r.suggestedPriority ?? "",
        r.waitingOn ?? "",
        r.assignee?.name ?? "",
        r.requester.name,
        r.dueAt ? formatExact(r.dueAt) : "",
        formatExact(r.createdAt),
        formatExact(r.updatedAt),
        r.occurrenceCount,
        r.reopenCount,
        r.sla ? `${r.sla.kind}:${r.sla.state}` : "",
      ]
        .map(esc)
        .join(","),
    );
  }
  const date = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="tasks-${date}.csv"` },
  });
}
