import { NextResponse } from "next/server";
import { getCurrentMember } from "@/server/session";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/** Change marker for live refresh: the newest activity event id/time. */
export async function GET() {
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const last = await db.activityEvent.findFirst({ orderBy: [{ at: "desc" }, { id: "desc" }], select: { id: true, at: true } });
  const n = await db.notification.count({ where: { memberId: me.id, readAt: null } });
  return NextResponse.json({ marker: `${last?.id ?? ""}:${n}` });
}
