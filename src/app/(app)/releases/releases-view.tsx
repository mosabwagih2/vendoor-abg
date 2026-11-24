"use client";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, CalendarClock } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Mono } from "@/components/ui/badges";
import { StatusIcon } from "@/components/icons/status-icon";
import { useApp } from "@/components/layout/app-context";
import { cn } from "@/lib/cn";
import { formatDue, formatExact } from "@/lib/format";
import type { TaskStatus } from "@/domain/types";
import { createUpcomingReleaseAction, recordReleaseAction } from "@/server/actions/misc";

interface R {
  id: string;
  number: string;
  state: string;
  type: string;
  releasedAt: string | null;
  targetDate: string | null;
  total: number;
  verified: number;
  pending: number;
  reopened: number;
}

export function ReleasesView({ title, releases, candidates, nextNumber }: { title: string; releases: R[]; candidates: Array<{ id: string; key: string; title: string; status: string }>; nextNumber: string }) {
  const t = useTranslations("releases");
  const { me } = useApp();
  const [mode, setMode] = useState<null | "record" | "plan">(null);
  const canRecord = me.side === "abg";
  return (
    <div>
      <PageHeader title={title}>
        {canRecord && (
          <>
            <Button size="sm" onClick={() => setMode("plan")}>
              <CalendarClock size={14} aria-hidden />
              {t("plan")}
            </Button>
            <Button size="sm" variant="primary" onClick={() => setMode("record")}>
              <Plus size={14} aria-hidden />
              {t("record")}
            </Button>
          </>
        )}
      </PageHeader>
      {!releases.length ? (
        <EmptyState title={t("empty")} />
      ) : (
        <ul className="mx-auto max-w-[1200px] divide-y divide-border">
          {releases.map((r) => (
            <li key={r.id}>
              <Link href={`/releases/${r.number}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-subtle sm:grid-cols-[180px_110px_90px_minmax(0,1fr)]">
                <Mono className="text-[13px] font-medium">{r.state === "upcoming" ? t("upcoming") : r.number}</Mono>
                <span className="tabular text-ui text-fg-secondary">{r.releasedAt ? formatDue(r.releasedAt) : r.targetDate ? formatDue(r.targetDate) : "—"}</span>
                <span className={cn("w-fit rounded-full px-2 text-meta font-medium", r.type === "hotfix" ? "bg-danger-subtle text-danger-text" : "bg-subtle text-fg-secondary")}>{t(r.type as "planned")}</span>
                <span className="col-span-2 flex flex-wrap items-center gap-3 text-meta text-fg-secondary sm:col-span-1">
                  <span>{t("tasks", { count: r.total })}</span>
                  {r.state === "released" && (
                    <>
                      <span className="inline-flex items-center gap-1">
                        <StatusIcon status="done" size={12} />
                        {t("verified")} {r.verified}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <StatusIcon status="shipped" size={12} />
                        {t("pending")} {r.pending}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <StatusIcon status="reopened" size={12} />
                        {t("reopened")} {r.reopened}
                      </span>
                    </>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!mode} onOpenChange={(o) => !o && setMode(null)}>
        {mode && (
          <DialogContent title={mode === "record" ? t("record") : t("plan")} wide>
            <ReleaseForm mode={mode} candidates={candidates} nextNumber={nextNumber} onDone={() => setMode(null)} />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function ReleaseForm({ mode, candidates, nextNumber, onDone }: { mode: "record" | "plan"; candidates: Array<{ id: string; key: string; title: string; status: string }>; nextNumber: string; onDone: () => void }) {
  const t = useTranslations("releases");
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const [type, setType] = useState<"planned" | "hotfix">("planned");
  const [at, setAt] = useState("");
  const [notes, setNotes] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set(candidates.filter((c) => c.status === "in_progress").map((c) => c.id)));
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r =
          mode === "record"
            ? await recordReleaseAction({ type, notes, taskIds: [...picked], releasedAt: at ? new Date(at).toISOString() : null })
            : await createUpcomingReleaseAction({ type, notes, taskIds: [...picked], targetDate: at.slice(0, 10) || new Date().toISOString().slice(0, 10) });
        setBusy(false);
        if (!r.ok) {
          toast.error(r.error === "forbidden" ? tc("forbidden") : tc("error"));
          return;
        }
        if (mode === "record") toast.success(t("recorded", { number: (r.data as { number: string }).number, count: picked.size }));
        else toast.success(tc("saved"));
        onDone();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>{t("number")}</Label>
          <div className="flex h-8 items-center rounded-control border border-border bg-subtle px-2.5 font-mono text-[13px]">{mode === "record" ? nextNumber : t("upcoming")}</div>
        </div>
        <div>
          <Label htmlFor="rel-at">{mode === "record" ? t("date") : t("targetDate")}</Label>
          <Input id="rel-at" type={mode === "record" ? "datetime-local" : "date"} value={at} onChange={(e) => setAt(e.target.value)} />
        </div>
        <fieldset>
          <legend className="mb-1 text-meta font-medium text-fg-secondary">{t("type")}</legend>
          <div className="flex gap-1.5">
            {(["planned", "hotfix"] as const).map((x) => (
              <button key={x} type="button" aria-pressed={type === x} onClick={() => setType(x)} className={cn("h-8 flex-1 rounded-control border text-ui", type === x ? "border-primary bg-primary text-primary-fg" : "border-border")}>
                {t(x)}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <div>
        <Label htmlFor="rel-notes">{t("notes")}</Label>
        <Textarea id="rel-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <fieldset>
        <legend className="text-meta font-medium text-fg-secondary">{t("pickTasks")}</legend>
        <p className="mb-1.5 text-meta text-fg-secondary">{t("pickHint")}</p>
        {!candidates.length ? (
          <p className="text-ui text-fg-secondary">{t("noTasks")}</p>
        ) : (
          <ul className="max-h-72 overflow-y-auto rounded-control border border-border">
            {candidates.map((c) => (
              <li key={c.id} className="border-b border-border last:border-0">
                <label className="flex items-center gap-2 px-2.5 py-2 text-ui hover:bg-subtle">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={picked.has(c.id)}
                    onChange={(e) => {
                      const n = new Set(picked);
                      if (e.target.checked) n.add(c.id);
                      else n.delete(c.id);
                      setPicked(n);
                    }}
                  />
                  <StatusIcon status={c.status as TaskStatus} label={ts(c.status as TaskStatus)} />
                  <Mono className="text-fg-secondary">{c.key}</Mono>
                  <span className="truncate">{c.title}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {mode === "record" ? t("save") : t("savePlan")}
        </Button>
      </div>
    </form>
  );
}

void formatExact;
