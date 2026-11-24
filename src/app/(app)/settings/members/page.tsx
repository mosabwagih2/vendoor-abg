import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { MembersView } from "./members-view";

export const metadata = { title: "Members" };

export default async function MembersPage() {
  const me = await requireMember();
  const members = await db.member.findMany({ include: { team: true }, orderBy: [{ team: { side: "asc" } }, { name: "asc" }] });
  return (
    <MembersView
      meId={me.id}
      members={members.map((m) => ({ id: m.id, name: m.name, email: m.email, role: m.role, status: m.status, side: m.team.side === "delivery" ? ("abg" as const) : ("vendoor" as const), lastActiveAt: m.lastActiveAt?.toISOString() ?? null }))}
    />
  );
}
