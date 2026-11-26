import { getTranslations } from "next-intl/server";
import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { numberList } from "@/server/json-list";
import { SettingsHeader } from "@/components/layout/settings-header";
import { WorkWeekForm } from "./work-week-form";

export const metadata = { title: "Work week settings" };

export default async function WorkWeekPage() {
  await requireMember();
  const t = await getTranslations("settings.workWeek");
  const ws = await db.workspace.findFirstOrThrow({ include: { holidays: { orderBy: { date: "asc" } } } });
  return (
    <>
      <SettingsHeader title={t("title")} hint={t("hint")} />
      <WorkWeekForm workingDays={numberList(ws.workingDays)} startMin={ws.workDayStartMin} endMin={ws.workDayEndMin} timezone={ws.timezone} holidays={ws.holidays.map((h) => ({ id: h.id, date: h.date.toISOString().slice(0, 10), name: h.name, certainty: h.certainty }))} />
    </>
  );
}
