"use client";
import { useTranslations } from "next-intl";
import { Check, RotateCcw, MessageSquareReply, Play, Rocket, CheckCheck, HelpCircle, XCircle, Merge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/layout/app-context";
import { availableActions, useWorkflow, type WorkflowTask } from "./workflow-actions";
import type { WorkflowAction } from "@/domain/workflow";

const ICONS: Partial<Record<WorkflowAction, typeof Check>> = {
  verify: Check,
  reopen: RotateCcw,
  answer: MessageSquareReply,
  start: Play,
  ship: Rocket,
  accept: CheckCheck,
  ask_info: HelpCircle,
  decline: XCircle,
  merge: Merge,
};

/** The next action for whoever must act (PRD 9.5.1: every action within two clicks of where the task appears). */
export function ActionButtons({ task, size = "sm", only, className }: { task: WorkflowTask; size?: "sm" | "md" | "lg"; only?: WorkflowAction[]; className?: string }) {
  const t = useTranslations("actions");
  const { me } = useApp();
  const { run } = useWorkflow();
  const order: WorkflowAction[] = ["verify", "reopen", "answer", "accept", "ask_info", "decline", "merge", "start", "ship"];
  const acts = availableActions(me, task).filter((a) => order.includes(a) && (!only || only.includes(a)));
  if (!acts.length) return null;
  const label: Record<string, string> = {
    verify: t("verify"),
    reopen: t("reopen"),
    answer: t("answer"),
    accept: t("accept"),
    ask_info: t("askInfo"),
    decline: t("decline"),
    merge: t("merge"),
    start: t("start"),
    ship: t("ship"),
  };
  const variant = (a: WorkflowAction) => (a === "verify" ? "success" : a === "accept" || a === "start" || a === "ship" ? "primary" : a === "answer" ? "waiting" : a === "reopen" || a === "decline" ? "dangerOutline" : "secondary");
  return (
    <div className={className ?? "flex flex-wrap gap-1.5"}>
      {order
        .filter((a) => acts.includes(a))
        .map((a) => {
          const Icon = ICONS[a]!;
          return (
            <Button key={a} size={size} variant={variant(a)} onClick={(e) => (e.stopPropagation(), run(task, a))}>
              <Icon size={14} aria-hidden />
              {label[a]}
            </Button>
          );
        })}
    </div>
  );
}
