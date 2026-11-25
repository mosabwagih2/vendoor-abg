import { getTranslations } from "next-intl/server";
import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { SettingsHeader } from "@/components/layout/settings-header";
import { GeneralForm } from "./general-form";

export const metadata = { title: "General settings" };

export default async function GeneralPage() {
  await requireMember();
  const t = await getTranslations("settings.general");
  const ws = await db.workspace.findFirstOrThrow();
  return (
    <>
      <SettingsHeader title={t("title")} hint={t("hint")} />
      <GeneralForm name={ws.name} timezone={ws.timezone} verifyDays={ws.verifyReminderWorkingDays} unverifiedDays={ws.unverifiedWorkingDays} />
    </>
  );
}
