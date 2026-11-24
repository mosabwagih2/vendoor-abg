"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { PriorityIcon } from "@/components/icons/priority-icon";
import { useApp } from "@/components/layout/app-context";
import { can } from "@/domain/policy";
import { cn } from "@/lib/cn";
import { formatDue } from "@/lib/format";
import { addHolidayAction, removeHolidayAction, saveSlaAction } from "@/server/actions/settings";
import type { Priority } from "@/domain/types";

const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const fromHHMM = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

export function SlaSettings(props: {
  workingDays: number[];
  startMin: number;
  endMin: number;
  targets: Array<{ priority: Priority; firstResponseMinutes: number; resolutionMinutes: number | null }>;
  holidays: Array<{ id: string; date: string; name: string; certainty: string }>;
}) {
  const t = useTranslations("settings");
  const tp = useTranslations("priority");
  const tc = useTranslations("common");
  const { me } = useApp();
  const editable = can(me, "manage_sla");
  const [days, setDays] = useState(props.workingDays);
  const [start, setStart] = useState(toHHMM(props.startMin));
  const [end, setEnd] = useState(toHHMM(props.endMin));
  const dayMinutes = Math.max(60, fromHHMM(end) - fromHHMM(start));
  const [targets, setTargets] = useState(props.targets.map((x) => ({ ...x, fr: x.firstResponseMinutes / 60, res: x.resolutionMinutes === null ? "" : String(+(x.resolutionMinutes / 480).toFixed(2)) })));
  const [hDate, setHDate] = useState("");
  const [hName, setHName] = useState("");
  const [hCert, setHCert] = useState<"confirmed" | "estimated">("confirmed");
  return (
    <div className="space-y-6">
      <form
        className="space-y-4 rounded-card border border-border bg-surface p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await saveSlaAction({
            workingDays: days,
            workDayStartMin: fromHHMM(start),
            workDayEndMin: fromHHMM(end),
            targets: targets.map((x) => ({ priority: x.priority, firstResponseMinutes: Math.round(Number(x.fr) * 60), resolutionMinutes: x.res === "" ? null : Math.round(Number(x.res) * 480) })),
          });
          if (r.ok) toast.success(tc("saved"));
          else toast.error(tc("error"));
        }}
      >
        <fieldset disabled={!editable} className="space-y-4">
          <div>
            <div className="mb-1 text-meta font-medium text-fg-secondary">{t("workingDays")}</div>
            <div className="flex flex-wrap gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={days.includes(d)}
                  onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort())}
                  className={cn("h-8 w-12 rounded-control border text-ui", days.includes(d) ? "border-primary bg-primary text-primary-fg" : "border-border")}
                >
                  {t(`days.${d}` as "days.0")}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="sla-from">{t("from")}</Label>
              <Input id="sla-from" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sla-to">{t("to")}</Label>
              <Input id="sla-to" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <span className="pb-2 text-meta text-fg-muted">Africa/Cairo · {dayMinutes / 60} h</span>
          </div>
          <table className="w-full text-ui">
            <thead className="text-meta text-fg-secondary">
              <tr>
                <th scope="col" className="py-1 text-start font-medium" />
                <th scope="col" className="py-1 text-start font-medium">{t("firstResponse")}</th>
                <th scope="col" className="py-1 text-start font-medium">{t("resolution")}</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((x, i) => (
                <tr key={x.priority} className="border-t border-border">
                  <th scope="row" className="py-1.5 text-start font-normal">
                    <span className="inline-flex items-center gap-1.5">
                      <PriorityIcon priority={x.priority} />
                      {tp(x.priority)}
                    </span>
                  </th>
                  <td className="py-1.5 pe-2">
                    <Input aria-label={`${tp(x.priority)} ${t("firstResponse")}`} type="number" min={0.25} step={0.25} value={x.fr} onChange={(e) => setTargets(targets.map((y, j) => (j === i ? { ...y, fr: Number(e.target.value) } : y)))} />
                  </td>
                  <td className="py-1.5">
                    <Input aria-label={`${tp(x.priority)} ${t("resolution")}`} type="number" min={0.25} step={0.25} placeholder={tc("none")} value={x.res} onChange={(e) => setTargets(targets.map((y, j) => (j === i ? { ...y, res: e.target.value } : y)))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {editable && (
            <div className="flex justify-end">
              <Button type="submit" size="sm" variant="primary">
                {tc("save")}
              </Button>
            </div>
          )}
        </fieldset>
      </form>

      <section className="rounded-card border border-border bg-surface p-4" aria-labelledby="hol-title">
        <h2 id="hol-title" className="mb-3 text-ui font-semibold">
          {t("holidays")}
        </h2>
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
              {h.certainty === "estimated" && <span className="rounded-full bg-warning-subtle px-2 text-meta text-[#8a5a00]">{t("estimated")}</span>}
              {editable && (
                <button type="button" aria-label={`${tc("remove")} ${h.name}`} onClick={() => removeHolidayAction(h.id)} className="rounded p-1 text-fg-muted hover:bg-subtle hover:text-danger">
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
