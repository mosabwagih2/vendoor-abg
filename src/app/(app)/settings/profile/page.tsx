import { getTranslations } from "next-intl/server";
import { requireMember } from "@/server/session";
import { SettingsHeader } from "@/components/layout/settings-header";
import { ProfileSettings } from "./profile-settings";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const me = await requireMember();
  const t = await getTranslations("settings.profilePage");
  return (
    <>
      <SettingsHeader title={t("title")} hint={t("hint")} />
      <ProfileSettings name={me.name} email={me.email} />
    </>
  );
}
