"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsCard, SettingsRow } from "@/components/layout/settings-header";
import { useApp } from "@/components/layout/app-context";
import { can } from "@/domain/policy";
import { saveGeneralAction } from "@/server/actions/settings";

/** Figma 5.8. Language and timezone are fixed for now, so they are shown but not editable. */
export function GeneralForm(props: { name: string; timezone: string; verifyDays: number; unverifiedDays: number; weeklyAuto: boolean; sendTime: string }) {
  const t = useTranslations("settings.general");
  const tc = useTranslations("common");
  const { me } = useApp();
  const editable = can(me, "manage_sla");
  const [name, setName] = useState(props.name);
  const [verify, setVerify] = useState(props.verifyDays);
  const [unverified, setUnverified] = useState(props.unverifiedDays);
  const [auto, setAuto] = useState(props.weeklyAuto);
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await saveGeneralAction({ name, verifyReminderWorkingDays: verify, unverifiedWorkingDays: unverified, weeklyReportAuto: auto });
        setBusy(false);
        r.ok ? toast.success(tc("saved")) : toast.error(tc("error"));
      }}
    >
      <fieldset disabled={!editable}>
        <SettingsCard title={t("workspace")}>
          <SettingsRow label={t("name")} hint={t("nameHint")}>
            <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} aria-label={t("name")} />
          </SettingsRow>
          <SettingsRow label={t("language")} hint={t("languageHint")}>
            <Input value="English" readOnly aria-label={t("language")} />
          </SettingsRow>
          <SettingsRow label={t("timezone")} hint={t("timezoneHint")}>
            <Input value={props.timezone} readOnly aria-label={t("timezone")} />
          </SettingsRow>
        </SettingsCard>
        <SettingsCard title={t("requests")}>
          <SettingsRow label={t("verifyWindow")} hint={t("verifyWindowHint")}>
            <Input type="number" min={1} max={30} value={verify} onChange={(e) => setVerify(Number(e.target.value))} aria-label={t("verifyWindow")} />
          </SettingsRow>
          <SettingsRow label={t("unverified")} hint={t("unverifiedHint")}>
            <Input type="number" min={1} max={60} value={unverified} onChange={(e) => setUnverified(Number(e.target.value))} aria-label={t("unverified")} />
          </SettingsRow>
        </SettingsCard>
        <SettingsCard title={t("reports")}>
          <SettingsRow label={t("weeklyAuto")} hint={t("weeklyAutoHint", { time: props.sendTime })}>
            <label className="flex items-center gap-2 text-ui">
              <input type="checkbox" role="switch" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="h-4 w-4 accent-[#2563eb]" />
              {auto ? t("on") : t("off")}
            </label>
          </SettingsRow>
        </SettingsCard>
        {editable && (
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={busy} className="bg-accent text-white">
              {t("save")}
            </Button>
          </div>
        )}
      </fieldset>
    </form>
  );
}
