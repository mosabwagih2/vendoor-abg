"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useApp } from "@/components/layout/app-context";
import { can } from "@/domain/policy";
import { cn } from "@/lib/cn";
import { formatDue } from "@/lib/format";
import { addHolidayAction, removeHolidayAction, saveSlaAction } from "@/server/actions/settings";

const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const fromHHMM = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};
/** Display order of the week: Saturday first, Friday last (Figma 8.3). Values follow JS weekdays, 0 = Sunday. */
const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5] as const;

export function WorkWeekForm(props: { workingDays: number[]; startMin: number; endMin: number; timezone: string; holidays: Array<{ id: string; date: string; name: string; certainty: string }> }) {
  const t = useTranslations("settings");
  const tw = useTranslations("settings.workWeek");
  const tc = useTranslations("common");
  const { me } = useApp();
  const editable = can(me, "manage_sla");
  const [days, setDays] = useState(props.workingDays);
  const [start, setStart] = useState(toHHMM(props.startMin));
  const [end, setEnd] = useState(toHHMM(props.endMin));
  const [busy, setBusy] = useState(false);
  const [hDate, setHDate] = useState("");
  const [hName, setHName] = useState("");
  const [hCert, setHCert] = useState<"confirmed" | "estimated">("confirmed");
  const toggle = (d: number) => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);
  return (
    <div className="space-y-5">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const r = await saveSlaAction({ workingDays: days, workDayStartMin: fromHHMM(start), workDayEndMin: fromHHMM(end) });
          setBusy(false);
          r.ok ? toast.success(tc("saved")) : toast.error(tc("error"));
        }}
      >
        <fieldset disabled={!editable} className="overflow-hidden rounded-card border border-border bg-surface">
          <ul className="divide-y divide-border">
            {WEEK_ORDER.map((d) => {
              const on = days.includes(d);
              return (
                <li key={d} className={cn("flex items-center gap-4 px-4 py-2.5", !on && "bg-canvas")}>
                  <button type="button" role="switch" aria-checked={on} aria-label={t(`dayLong.${d}` as "dayLong.0")} onClick={() => toggle(d)} className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", on ? "bg-accent" : "bg-border-strong")}>
                    <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "start-[18px]" : "start-0.5")} />
                  </button>
                  <span className="w-28 text-ui font-medium">{t(`dayLong.${d}` as "dayLong.0")}</span>
                  {on ? (
                    <span className="flex items-center gap-2 text-ui text-fg-secondary">
                      <Input aria-label={`${t(`dayLong.${d}` as "dayLong.0")} ${t("from")}`} type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-28" />
                      –
                      <Input aria-label={`${t(`dayLong.${d}` as "dayLong.0")} ${t("to")}`} type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-28" />
                    </span>
                  ) : (
                    <span className="text-meta text-fg-muted">{tw("dayOff")}</span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="border-t border-border px-4 py-2 text-meta text-fg-muted">{tw("sameHours")}</p>
          {editable && (
            <div className="flex justify-end border-t border-border px-4 py-3">
              <Button type="submit" variant="primary" disabled={busy || days.length === 0} className="bg-accent text-white">
                {tc("save")}
              </Button>
            </div>
          )}
        </fieldset>
      </form>

      <div className="grid gap-3 sm:grid-cols-3">
        <ReadOnly label={tw("timezone")} value={props.timezone} />
        <ReadOnly label={tw("weekStarts")} value={t("dayLong.6")} />
        <ReadOnly label={tw("weeklyReport")} value={tw("weeklyReportValue")} />
      </div>

      <section className="rounded-card border border-border bg-surface p-4" aria-labelledby="hol-title">
        <h2 id="hol-title" className="mb-1 text-ui font-semibold">
          {t("holidays")}
        </h2>
        <p className="mb-3 text-meta text-fg-muted">{tw("holidaysHint")}</p>
        {editable && (
          <form
            className="mb-3 flex flex-wrap items-end gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await addHolidayAction(hDate, hName, hCert);
              if (r.ok) {
                setHDate("");
                setHName("");
              } else toast.error(tc("error"));
            }}
          >
            <div>
              <Label htmlFor="h-date">{t("holidayDate")}</Label>
              <Input id="h-date" type="date" required value={hDate} onChange={(e) => setHDate(e.target.value)} />
            </div>
            <div className="min-w-40 flex-1">
              <Label htmlFor="h-name">{t("holidayName")}</Label>
              <Input id="h-name" required value={hName} onChange={(e) => setHName(e.target.value)} />
            </div>
            <Select aria-label={t("estimated")} value={hCert} onChange={(e) => setHCert(e.target.value as "confirmed")} className="w-auto">
              <option value="confirmed">{t("confirmed")}</option>
              <option value="estimated">{t("estimated")}</option>
            </Select>
            <Button type="submit" size="md">
              {t("addHoliday")}
            </Button>
          </form>
        )}
        <ul className="divide-y divide-border">
          {props.holidays.map((h) => (
            <li key={h.id} className="flex items-center gap-3 py-1.5 text-ui">
              <span className="tabular w-36 text-fg-secondary">{formatDue(h.date + "T12:00:00Z")}</span>
              <span className="flex-1">{h.name}</span>
              {h.certainty === "estimated" && <span className="rounded-full bg-warning-subtle px-2 text-meta text-warning-text">{t("estimated")}</span>}
              {editable && (
                <button type="button" aria-label={`${tc("remove")} ${h.name}`} onClick={() => removeHolidayAction(h.id)} className="rounded p-1 text-fg-secondary hover:bg-subtle hover:text-danger">
                  <Trash2 size={13} aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-meta font-medium text-fg-secondary">{label}</div>
      <div className="rounded-control border border-border bg-canvas px-3 py-2 text-ui">{value}</div>
    </div>
  );
}
