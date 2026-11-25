"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriorityIcon } from "@/components/icons/priority-icon";
import { useApp } from "@/components/layout/app-context";
import { can } from "@/domain/policy";
import { saveSlaAction } from "@/server/actions/settings";
import type { Priority } from "@/domain/types";

interface Row {
  priority: Priority;
  firstResponseMinutes: number;
  resolutionMinutes: number | null;
  open: number;
}

/** Figma 5.7: five priorities with first-reply and fix targets. First reply is in working hours, fix target in working days. */
export function PrioritiesForm({ rows }: { rows: Row[] }) {
  const t = useTranslations("settings.priorities");
  const tp = useTranslations("priority");
  const tc = useTranslations("common");
  const { me } = useApp();
  const editable = can(me, "manage_sla");
  const [state, setState] = useState(rows.map((r) => ({ ...r, fr: r.firstResponseMinutes / 60, res: r.resolutionMinutes === null ? "" : String(+(r.resolutionMinutes / 480).toFixed(2)) })));
  const [busy, setBusy] = useState(false);
  const set = (i: number, patch: Partial<(typeof state)[number]>) => setState(state.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await saveSlaAction({ targets: state.map((x) => ({ priority: x.priority, firstResponseMinutes: Math.round(Number(x.fr) * 60), resolutionMinutes: x.res === "" ? null : Math.round(Number(x.res) * 480) })) });
        setBusy(false);
        r.ok ? toast.success(tc("saved")) : toast.error(tc("error"));
      }}
    >
      <fieldset disabled={!editable} className="overflow-hidden rounded-card border border-border bg-surface">
        <table className="w-full text-ui">
          <thead className="bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-fg-muted">
            <tr>
              <th scope="col" className="px-4 py-2.5 text-start font-semibold">{t("priority")}</th>
              <th scope="col" className="px-2 py-2.5 text-start font-semibold">{t("firstReply")}</th>
              <th scope="col" className="px-2 py-2.5 text-start font-semibold">{t("fixTarget")}</th>
              <th scope="col" className="px-4 py-2.5 text-end font-semibold">{t("tasks")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {state.map((x, i) => (
              <tr key={x.priority}>
                <th scope="row" className="px-4 py-2.5 text-start font-semibold">
                  <span className="inline-flex items-center gap-2">
                    <PriorityIcon priority={x.priority} />
                    {tp(x.priority)}
                  </span>
                </th>
                <td className="px-2 py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Input aria-label={`${tp(x.priority)} ${t("firstReply")}`} type="number" min={0.25} step={0.25} value={x.fr} onChange={(e) => set(i, { fr: Number(e.target.value) })} className="w-20" />
                    <span className="text-meta text-fg-muted">{t("hours")}</span>
                  </span>
                </td>
                <td className="px-2 py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Input aria-label={`${tp(x.priority)} ${t("fixTarget")}`} type="number" min={0.25} step={0.25} placeholder="—" value={x.res} onChange={(e) => set(i, { res: e.target.value })} className="w-20" />
                    <span className="text-meta text-fg-muted">{t("days")}</span>
                  </span>
                </td>
                <td className="tabular px-4 py-2 text-end text-fg-secondary">{t("open", { count: x.open })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {editable && (
          <div className="flex justify-end border-t border-border px-4 py-3">
            <Button type="submit" variant="primary" disabled={busy} className="bg-accent text-white">
              {t("save")}
            </Button>
          </div>
        )}
      </fieldset>
      <p className="mt-3 flex items-center gap-2 rounded-control bg-warning-subtle px-3 py-2.5 text-ui text-warning-text">
        <Clock size={14} aria-hidden />
        {t("note")}
      </p>
    </form>
  );
}
