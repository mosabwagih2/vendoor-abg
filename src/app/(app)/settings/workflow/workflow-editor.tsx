"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Lock, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { NAME_MAX, STATUS_COLORS } from "@/domain/custom-status";
import type { StatusGroup } from "@/domain/status-display";
import { addCustomStatusAction, deleteCustomStatusAction, updateCustomStatusAction } from "@/server/actions/custom-status";

const DOT: Record<StatusGroup, string> = { request: "#8b5cf6", processing: "#f59e0b", stuck: "#e5484d", completed: "#2563eb", done: "#16a06a" };

interface Step {
  group: StatusGroup;
  label: string;
  count: number;
  customizable: boolean;
  custom: Array<{ id: string; name: string; color: string; count: number }>;
}

/** Figma 5.1: five steps in a row. Each step has a built-in status and can hold your own (rename, recolour, delete). */
export function WorkflowEditor({ steps, canEdit }: { steps: Step[]; canEdit: boolean }) {
  const t = useTranslations("settings.workflow");
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
      {steps.map((s) => (
        <div key={s.group} className="rounded-card bg-canvas p-3">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
            {t(`step.${s.group}`)}
            {s.group === "done" && <Lock size={11} aria-label={t("locked")} />}
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2 rounded-control border border-border bg-surface px-2.5 py-2 text-ui font-medium">
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: DOT[s.group] }} />
              <span className="flex-1">{s.label}</span>
              <span className="tabular text-meta text-fg-muted">{s.count}</span>
            </div>
            {s.custom.map((c) => (
              <CustomRow key={c.id} row={c} fallback={s.label} canEdit={canEdit} />
            ))}
            {s.customizable && canEdit && <AddRow group={s.group} />}
          </div>
          <p className="mt-2 text-meta text-fg-muted">{t(`owner.${s.group}`)}</p>
        </div>
      ))}
    </div>
  );
}

function Swatches({ value, onPick }: { value: string; onPick: (c: string) => void }) {
  const t = useTranslations("settings.workflow");
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("color")}>
      {STATUS_COLORS.map((c) => (
        <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={c} onClick={() => onPick(c)} className={cn("h-5 w-5 rounded-full ring-offset-2", value === c && "ring-2 ring-fg")} style={{ background: c }} />
      ))}
    </div>
  );
}

function CustomRow({ row, fallback, canEdit }: { row: Step["custom"][number]; fallback: string; canEdit: boolean }) {
  const t = useTranslations("settings.workflow");
  const tc = useTranslations("common");
  const [name, setName] = useState(row.name);
  const errorText = (e?: string) => (e === "duplicate" ? t("errDuplicate") : e === "too_long" ? t("errTooLong") : e === "empty" ? t("errEmpty") : tc("error"));
  async function save(patch: { name?: string; color?: string }) {
    const r = await updateCustomStatusAction(row.id, patch);
    if (!r.ok) {
      toast.error(errorText(r.message ?? r.error));
      setName(row.name);
    }
  }
  return (
    <div className="flex items-center gap-2 rounded-control border border-accent/40 bg-surface px-2.5 py-2 text-ui font-medium">
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: row.color }} />
      <span className="min-w-0 flex-1 truncate" title={`${row.name} (${t("custom")})`}>{row.name}</span>
      <span className="tabular text-meta text-fg-muted">{row.count}</span>
      {canEdit && (
        <Popover>
          <PopoverTrigger aria-label={`${t("edit")} ${row.name}`} className="rounded p-0.5 text-fg-muted hover:bg-subtle">
            <MoreHorizontal size={14} aria-hidden />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-60 space-y-3 p-3">
            <div>
              <label htmlFor={`rn-${row.id}`} className="mb-1 block text-meta font-medium text-fg-secondary">
                {t("rename")}
              </label>
              <Input id={`rn-${row.id}`} value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() !== row.name && save({ name })} onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur(), true)} />
            </div>
            <Swatches value={row.color} onPick={(c) => save({ color: c })} />
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-1 py-1 text-ui text-danger-text hover:bg-danger-subtle"
              onClick={async () => {
                const r = await deleteCustomStatusAction(row.id);
                if (r.ok) toast.success(t("deleted", { count: (r.data as { moved: number }).moved, to: fallback }));
                else toast.error(tc("error"));
              }}
            >
              <Trash2 size={14} aria-hidden />
              {t("delete")}
            </button>
            <p className="text-meta text-fg-muted">{t("deleteHint", { count: row.count, name: row.name, to: fallback })}</p>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function AddRow({ group }: { group: StatusGroup }) {
  const t = useTranslations("settings.workflow");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(STATUS_COLORS[4]);
  const [busy, setBusy] = useState(false);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-1.5 px-1 py-1.5 text-ui font-medium text-accent hover:underline">
        <Plus size={14} aria-hidden />
        {t("addStatus")}
      </button>
    );
  return (
    <form
      className="space-y-2 rounded-control border border-border bg-surface p-2.5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await addCustomStatusAction({ stepGroup: group, name, color });
        setBusy(false);
        if (r.ok) {
          setName("");
          setOpen(false);
        } else toast.error(r.message === "duplicate" ? t("errDuplicate") : r.message === "empty" ? t("errEmpty") : tc("error"));
      }}
    >
      <Input autoFocus aria-label={t("statusName")} placeholder={t("statusName")} value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} />
      <Swatches value={color} onPick={setColor} />
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {tc("cancel")}
        </Button>
        <Button size="sm" type="submit" variant="primary" disabled={busy || !name.trim()}>
          {tc("add")}
        </Button>
      </div>
    </form>
  );
}
