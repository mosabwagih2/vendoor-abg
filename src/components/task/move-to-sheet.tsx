"use client";
import { useState } from "react";
import * as D from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, ChevronRight, Lock, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { StatusLozenge } from "@/components/ui/lozenge";
import { GROUP_REPRESENTATIVE } from "@/domain/status-display";
import { moveOptions } from "@/domain/move-options";
import { useApp } from "@/components/layout/app-context";
import { availableActions, useWorkflow, type WorkflowTask } from "./workflow-actions";

/** Figma 6.7: on a phone the Status row opens a bottom sheet with the steps this person can move the task to. */
export function MoveToSheet({ task, custom }: { task: WorkflowTask & { customStatus?: { name: string; color: string } | null }; custom?: { name: string; color: string } | null }) {
  const t = useTranslations("moveTo");
  const { me } = useApp();
  const { run } = useWorkflow();
  const [open, setOpen] = useState(false);
  const options = moveOptions(task.status, availableActions(me, task));
  if (options.length < 2) return null;
  return (
    <div className="md:hidden">
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-2 rounded-card bg-subtle px-3 py-2.5 text-start" aria-haspopup="dialog">
        <span className="text-ui text-fg-secondary">{t("status")}</span>
        <StatusLozenge status={task.status} custom={custom} />
        <ChevronDown size={16} className="ms-auto text-fg-muted" aria-hidden />
      </button>
      <D.Root open={open} onOpenChange={setOpen}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-40 bg-black/35" />
          <D.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-[20px] bg-surface px-4 pb-6 pt-2 shadow-[var(--shadow-pop)] focus:outline-none">
            <span aria-hidden className="mx-auto mb-3 block h-1 w-9 rounded-full bg-border-strong" />
            <div className="mb-3 flex items-center">
              <D.Title className="text-[20px] font-bold">{t("title")}</D.Title>
              <D.Description className="sr-only">{t("title")}</D.Description>
              <D.Close aria-label={t("close")} className="ms-auto grid h-9 w-9 place-items-center rounded-full bg-subtle">
                <X size={16} aria-hidden />
              </D.Close>
            </div>
            <ul className="space-y-2.5">
              {options.map((o) => (
                <li key={o.group}>
                  <button
                    type="button"
                    disabled={o.current}
                    onClick={() => {
                      setOpen(false);
                      if (o.action) run(task, o.action);
                    }}
                    className={cn("flex w-full items-center gap-3 rounded-xl border p-3.5 text-start", o.current ? "border-[#c9d8fb] bg-info-subtle" : "border-border bg-surface")}
                  >
                    <span className="min-w-0 flex-1">
                      <StatusLozenge status={o.current ? task.status : GROUP_REPRESENTATIVE[o.group]} custom={o.current ? custom : null} />
                      <span className="mt-1.5 block text-ui text-fg-secondary">{t(`hint.${o.group}`)}</span>
                    </span>
                    {o.current ? <Check size={18} className="text-accent" aria-hidden /> : <ChevronRight size={16} className="text-fg-muted rtl:rotate-180" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
            {me.side === "abg" && (
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-warning-subtle px-3 py-2.5 text-ui text-warning-text">
                <Lock size={14} aria-hidden />
                {t("doneLock")}
              </p>
            )}
          </D.Content>
        </D.Portal>
      </D.Root>
    </div>
  );
}
