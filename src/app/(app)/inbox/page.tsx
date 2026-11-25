import { requireMember } from "@/server/session";
import { loadTaskDetail } from "@/server/task-detail";
import { loadInbox, markTaskNotificationsRead } from "@/server/inbox";
import { countByTab, filterByTab, parseInboxTab } from "@/domain/inbox";
import { InboxView } from "./inbox-view";

export const metadata = { title: "Inbox" };

/** Figma 1.2: tasks that involve you on the left, the selected task on the right. */
export default async function InboxPage({ searchParams }: { searchParams: Promise<{ tab?: string; t?: string }> }) {
  const me = await requireMember();
  const sp = await searchParams;
  const tab = parseInboxTab(sp.tab);
  const all = await loadInbox(me);
  const rows = filterByTab(all, tab, me.side);
  const selected = rows.find((r) => r.key === sp.t) ?? rows[0] ?? null;
  const detail = selected ? await loadTaskDetail(selected.key, me) : null;
  if (selected?.unread) await markTaskNotificationsRead(me, selected.id);
  return <InboxView tab={tab} counts={countByTab(all, me.side)} rows={rows} selectedKey={selected?.key ?? null} explicit={!!sp.t} detail={detail} viewerSide={me.side} />;
}
