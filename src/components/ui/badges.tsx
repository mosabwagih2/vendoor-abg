"use client";
import { useTranslations } from "next-intl";
import { Clock, Pause, AlertTriangle } from "lucide-react";
import { StatusIcon } from "@/components/icons/status-icon";
import { PriorityIcon } from "@/components/icons/priority-icon";
import { cn } from "@/lib/cn";
import { formatDue, formatExact, relative } from "@/lib/format";
import type { Priority, TaskStatus } from "@/domain/types";
import { Tooltip } from "./tooltip";

export function StatusBadge({ status, className, iconOnly }: { status: TaskStatus; className?: string; iconOnly?: boolean }) {
  const t = useTranslations("status");
  if (iconOnly) return <StatusIcon status={status} label={t(status)} />;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-ui", status === "closed" && "text-fg-secondary", className)}>
      <StatusIcon status={status} />
      {t(status)}
    </span>
  );
}

export function PriorityBadge({ priority, suggested, iconOnly, className }: { priority: Priority | null; suggested?: Priority | null; iconOnly?: boolean; className?: string }) {
  const t = useTranslations("priority");
  const p = priority ?? suggested ?? null;
  const label = priority ? t(priority) : suggested ? t("suggested", { priority: t(suggested) }) : t("none");
  if (iconOnly) return <PriorityIcon priority={p} suggested={!priority && !!suggested} label={label} />;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-ui", !priority && "text-fg-secondary", className)}>
      <PriorityIcon priority={p} suggested={!priority && !!suggested} />
      {label}
    </span>
  );
}

/** "Waiting on" is a first-class badge, with text, never colour alone. */
export function WaitingBadge({ side, viewerSide, className }: { side: "abg" | "vendoor" | null; viewerSide?: "abg" | "vendoor"; className?: string }) {
  const t = useTranslations("waiting");
  if (!side) return <span className={cn("text-meta text-fg-muted", className)}>{t("nobody")}</span>;
  const mine = viewerSide === side;
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-meta font-medium",
        mine ? "border-transparent bg-waiting text-white" : side === "vendoor" ? "border-waiting/40 bg-info-subtle text-[#0a5cc2]" : "border-border bg-subtle text-fg-secondary",
        className,
      )}
    >
      {mine ? t("you") : t(side)}
    </span>
  );
}

export function SlaBadge({ sla }: { sla: { kind: "first_response" | "resolution"; state: "ok" | "at_risk" | "breached" | "paused"; dueAt: string | null } | null }) {
  const t = useTranslations("sla");
  if (!sla || sla.state === "ok") return null;
  const Icon = sla.state === "paused" ? Pause : sla.state === "breached" ? AlertTriangle : Clock;
  const label = `${t(sla.kind)}: ${t(sla.state)}`;
  const badge = (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full px-1.5 text-meta font-medium",
        sla.state === "breached" && "bg-danger-subtle text-danger",
        sla.state === "at_risk" && "bg-warning-subtle text-[#8a5a00]",
        sla.state === "paused" && "bg-subtle text-fg-secondary",
      )}
    >
      <Icon size={12} aria-hidden />
      {t(sla.state)}
      <span className="sr-only">{label}</span>
    </span>
  );
  return <Tooltip content={sla.dueAt ? `${label} · ${formatExact(sla.dueAt)}` : label}>{badge}</Tooltip>;
}

export function DueDate({ dueAt, overdue, className }: { dueAt: string | null; overdue?: boolean; className?: string }) {
  if (!dueAt) return <span className={cn("text-fg-muted", className)}>—</span>;
  return (
    <Tooltip content={formatExact(dueAt)}>
      <span className={cn("tabular whitespace-nowrap", overdue ? "font-medium text-danger" : "text-fg-secondary", className)}>{formatDue(dueAt)}</span>
    </Tooltip>
  );
}

export function RelativeTime({ at, className }: { at: string | Date; className?: string }) {
  return (
    <Tooltip content={formatExact(at)}>
      <time suppressHydrationWarning dateTime={new Date(at).toISOString()} className={cn("tabular whitespace-nowrap text-fg-secondary", className)}>
        {relative(at)}
      </time>
    </Tooltip>
  );
}

export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[12px] tracking-tight", className)}>{children}</span>;
}
