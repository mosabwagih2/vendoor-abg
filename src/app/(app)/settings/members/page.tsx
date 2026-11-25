import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { getTranslations } from "next-intl/server";
import { SettingsHeader } from "@/components/layout/settings-header";
import { MembersView } from "./members-view";

export const metadata = { title: "Members" };

export default async function MembersPage() {
  const me = await requireMember();
  const t = await getTranslations("settings.membersPage");
  const members = await db.member.findMany({ include: { team: true }, orderBy: [{ team: { side: "asc" } }, { name: "asc" }] });
  return (
    <>
      <SettingsHeader title={t("title")} hint={t("hint")} />
      <MembersView
      meId={me.id}
      members={members.map((m) => ({ id: m.id, name: m.name, email: m.email, role: m.role, status: m.status, side: m.team.side === "delivery" ? ("abg" as const) : ("vendoor" as const), lastActiveAt: m.lastActiveAt?.toISOString() ?? null }))}
    />
    </>
  );
}
