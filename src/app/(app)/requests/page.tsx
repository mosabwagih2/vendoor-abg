import { getTranslations } from "next-intl/server";
import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { decorate, taskRowSelect } from "@/server/queries";
import { loadTaskDetail } from "@/server/task-detail";
import { RequestsView } from "./requests-view";

export const metadata = { title: "Requests" };

/** FR-4.1 triage queue: oldest first, with age and first-response SLA. Vendoor sees it read-only (FR-4.4). */
export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ peek?: string }> }) {
  const me = await requireMember();
  const sp = await searchParams;
  const t = await getTranslations("requests");
  const rows = await decorate(await db.task.findMany({ where: { status: "triage", archivedAt: null }, select: taskRowSelect, orderBy: { createdAt: "asc" } }));
  const selectedKey = sp.peek ?? rows[0]?.key;
  const selected = selectedKey ? await loadTaskDetail(selectedKey, me) : null;
  return <RequestsView rows={rows} selected={selected && selected.status === "triage" ? selected : selected} title={t("title")} />;
}
