"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label, Select, Textarea } from "@/components/ui/input";
import { alertAbgAction, postIncidentUpdateAction, resolveIncidentAction } from "@/server/actions/misc";
import { closingProblems, nextStates, type IncidentState } from "@/domain/incident";
import type { Side } from "@/domain/types";

/** Right column of the incident page. Vendoor can only re-alert ABG; ABG can post updates and close with the three-part summary. */
export function IncidentControls({ incidentId, state, side }: { incidentId: string; state: IncidentState; side: Side }) {
  const t = useTranslations("trouble");
  const tc = useTranslations("common");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [next, setNext] = useState<IncidentState | "">("");
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r.ok) return void toast.error(r.error === "forbidden" ? tc("forbidden") : tc("error"));
    toast.success(ok);
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-card border border-border bg-surface p-4">
      <Button variant="dangerOutline" className="w-full" disabled={busy} onClick={() => run(() => alertAbgAction(incidentId), t("alerted"))}>
        <Send size={14} aria-hidden />
        {t("alertAbg")}
      </Button>
      {side === "abg" && (
        <>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const r = await postIncidentUpdateAction({ incidentId, body, state: next === "resolved" ? undefined : next || undefined });
                if (r.ok) {
                  setBody("");
                  setNext("");
                }
                return r;
              }, t("updatePosted"));
            }}
          >
            <Label htmlFor="inc-body">{t("postUpdate")}</Label>
            <Textarea id="inc-body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("updatePlaceholder")} />
            <Label htmlFor="inc-state">{t("moveTo")}</Label>
            <Select id="inc-state" value={next} onChange={(e) => setNext(e.target.value as IncidentState | "")}>
              <option value="">{t("keepState")}</option>
              {nextStates(state).map((s) => (
                <option key={s} value={s}>
                  {t(`state.${s}`)}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary" className="w-full" disabled={busy || !body.trim()}>
              {t("post")}
            </Button>
          </form>
          <Button variant="success" className="w-full" onClick={() => setClosing(true)}>
            {t("markFixed")}
          </Button>
          <Dialog open={closing} onOpenChange={setClosing}>
            {closing && (
              <DialogContent title={t("closeTitle")}>
                <CloseForm
                  busy={busy}
                  onCancel={() => setClosing(false)}
                  onSubmit={(f) =>
                    run(async () => {
                      const r = await resolveIncidentAction({ incidentId, ...f });
                      if (r.ok) setClosing(false);
                      return r;
                    }, t("closed"))
                  }
                />
              </DialogContent>
            )}
          </Dialog>
        </>
      )}
    </div>
  );
}

function CloseForm({ busy, onCancel, onSubmit }: { busy: boolean; onCancel: () => void; onSubmit: (f: { summary: string; impact: string; resolution: string }) => void }) {
  const t = useTranslations("trouble");
  const tc = useTranslations("common");
  const [f, setF] = useState({ summary: "", impact: "", resolution: "" });
  const missing = closingProblems(f);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(f);
      }}
    >
      <p className="text-ui text-fg-secondary">{t("closeBody")}</p>
      {(["summary", "impact", "resolution"] as const).map((k) => (
        <div key={k}>
          <Label htmlFor={`close-${k}`}>{t(k)}</Label>
          <Textarea id={`close-${k}`} rows={2} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={t(`${k}Hint`)} />
        </div>
      ))}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {tc("cancel")}
        </Button>
        <Button type="submit" variant="success" disabled={busy || missing.length > 0}>
          {t("markFixed")}
        </Button>
      </div>
    </form>
  );
}
