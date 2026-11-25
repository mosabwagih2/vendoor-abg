import { getTranslations } from "next-intl/server";
import { SettingsNav } from "./settings-nav";

/** Figma 5.x: a settings menu on the left, the chosen page on the right. On a phone the menu becomes a scrolling row. */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("settings");
  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <SettingsNav title={t("title")} />
      <div className="min-w-0 flex-1 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-[960px]">{children}</div>
      </div>
    </div>
  );
}
