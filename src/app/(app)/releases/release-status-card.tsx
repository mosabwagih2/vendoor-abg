"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CalendarClock, Rocket, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label, Textarea } from "@/components/ui/input";
import { useApp } from "@/components/layout/app-context";
import { cn } from "@/lib/cn";
import { formatExact } from "@/lib/format";
import { canRollBack, type ReleaseState } from "@/domain/release-state";
import { rollbackReleaseAction } from "@/server/actions/misc";

interface Props {
  id: string;
  state: ReleaseState;
  number: string;
  releasedAt: string | null;
  targetDate: string | null;
  notes: string;
  deployedBy: string | null;
  rolledBackAt: string | null;
  rollbackReason: string | null;
}

/** Figma 4.4: the green "Live on the server" card (or Draft / Rolled back) at the top of a release, with Roll back for ABG. */
export function ReleaseStatusCard({ release }: { release: Props }) {
  const t = useTranslations("releases");
  const { me } = useApp();
  const [open, setOpen] = useState(false);
  const tone = release.state === "released" ? "border-[#bfe5d2] bg-[#eaf8f1]" : release.state === "rolled_back" ? "border-[#f3c5c4] bg-danger-subtle" : "border-border bg-subtle";
  const color = release.state === "released" ? "text-[#0e7c4f]" : release.state === "rolled_back" ? "text-danger-text" : "text-fg";
  const Icon = release.state === "released" ? Rocket : release.state === "rolled_back" ? RotateCcw : CalendarClock;
  const title = release.state === "released" ? t("liveTitle") : release.state === "rolled_back" ? t("rolledBackTitle") : t("draftTitle");
  const when = release.state === "rolled_back" ? release.rolledBackAt : release.releasedAt ?? release.targetDate;
  const detail = [when ? formatExact(when) : null, release.deployedBy ? t("deployedBy", { name: release.deployedBy }) : null].filter(Boolean).join(" · ");
  return (
    <section className={cn("flex items-center gap-3 rounded-xl border px-4 py-3", tone)} aria-label={title}>
      <Icon size={18} aria-hidden className={color} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className={cn("text-[14px] font-semibold", color)}>{title}</h2>
          <span suppressHydrationWarning className="text-[12.5px] text-fg-muted">{detail}</span>
        </div>
        {release.state === "rolled_back" && release.rollbackReason && <p className="text-[13px] text-fg-secondary">{t("rollbackReason", { reason: release.rollbackReason })}</p>}
        {release.state === "released" && release.notes && <p className="line-clamp-2 text-[13px] text-fg-secondary">{t("noteLine", { note: release.notes })}</p>}
      </div>
      {me.side === "abg" && canRollBack(release.state) && (
        <Button size="sm" variant="dangerOutline" onClick={() => setOpen(true)}>
          {t("rollback")}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <DialogContent title={t("rollbackTitle", { number: release.number })}>
            <RollbackForm releaseId={release.id} onDone={() => setOpen(false)} />
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}

function RollbackForm({ releaseId, onDone }: { releaseId: string; onDone: () => void }) {
  const t = useTranslations("releases");
  const tc = useTranslations("common");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await rollbackReleaseAction({ releaseId, reason });
        setBusy(false);
        if (!r.ok) return void toast.error(r.error === "forbidden" ? tc("forbidden") : tc("error"));
        toast.success(t("rolledBackDone", { count: (r.data as { reverted: number }).reverted }));
        onDone();
      }}
    >
      <p className="text-ui text-fg-secondary">{t("rollbackBody")}</p>
      <div>
        <Label htmlFor="rb-reason">{t("rollbackReasonLabel")}</Label>
        <Textarea id="rb-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" variant="danger" disabled={busy || reason.trim().length < 2}>
          {t("rollback")}
        </Button>
      </div>
    </form>
  );
}
