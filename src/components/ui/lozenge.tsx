"use client";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { statusGroup, type StatusGroup } from "@/domain/status-display";
import type { TaskStatus } from "@/domain/types";

/** Soft background, coloured dot, dark label. Colours are the Figma status palette. */
const TONES: Record<StatusGroup | "closed", { bg: string; fg: string; dot: string }> = {
  request: { bg: "#f0ebfe", fg: "#5b34c4", dot: "#8b5cf6" },
  processing: { bg: "#fff4d6", fg: "#7a5000", dot: "#f59e0b" },
  stuck: { bg: "#fdecec", fg: "#b42318", dot: "#e5484d" },
  completed: { bg: "#eaf1ff", fg: "#1d4ed8", dot: "#2563eb" },
  done: { bg: "#e4f6ec", fg: "#0e7c4f", dot: "#16a06a" },
  closed: { bg: "#eef0f3", fg: "#4b5160", dot: "#7a8090" },
};

export function StatusLozenge({ status, className }: { status: TaskStatus; className?: string }) {
  const t = useTranslations("statusGroup");
  const group = statusGroup(status);
  const tone = TONES[group ?? "closed"];
  return (
    <span className={cn("inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-[12px] font-medium", className)} style={{ background: tone.bg, color: tone.fg }}>
      <span aria-hidden className="h-[7px] w-[7px] rounded-full" style={{ background: tone.dot }} />
      {group ? t(group) : t("closed")}
    </span>
  );
}
