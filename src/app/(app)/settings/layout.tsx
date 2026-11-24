import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsNav } from "./settings-nav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("settings");
  return (
    <div>
      <PageHeader title={t("title")} />
      <SettingsNav />
      <div className="mx-auto max-w-[960px] px-4 py-5">{children}</div>
    </div>
  );
}
