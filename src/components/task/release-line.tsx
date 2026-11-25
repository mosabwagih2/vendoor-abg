"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Rocket, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatExact } from "@/lib/format";
import { releaseLine, showReleaseLine, type ReleaseInfo } from "@/domain/release-line";
import type { Side } from "@/domain/types";

/** Under the action bar: where this task is on the server, taken from its release. */
export function ReleaseLine({ release, side }: { release: (ReleaseInfo & { id: string }) | null; side: Side }) {
  const t = useTranslations("releaseLine");
  const line = releaseLine(release);
  if (!showReleaseLine(line, side)) return null;
  const tone = line.kind === "live" ? "border-[#bfe5d2] bg-[#eaf8f1] text-[#0e7c4f]" : line.kind === "rolled_back" ? "border-[#f3c5c4] bg-danger-subtle text-danger-text" : "border-border bg-subtle text-fg";
  const Icon = line.kind === "rolled_back" ? RotateCcw : Rocket;
  const title = line.kind === "live" ? t("live") : line.kind === "rolled_back" ? t("rolledBack") : line.kind === "draft" ? t("draft") : t("notReleased");
  const detail =
    line.kind === "live" ? [line.number, line.at ? formatExact(line.at) : null, line.by ? t("by", { name: line.by }) : null].filter(Boolean).join(" · ")
    : line.kind === "rolled_back" ? [line.number, line.reason].filter(Boolean).join(" · ")
    : line.kind === "draft" ? t("draftIn", { number: line.number })
    : t("willGo");
  return (
    <div className={cn("flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5", tone)}>
      <Icon size={16} aria-hidden className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold">{title}</p>
        <p suppressHydrationWarning className={cn("truncate text-[12.5px]", line.kind === "live" || line.kind === "rolled_back" ? "opacity-80" : "text-fg-muted")}>
          {detail}
        </p>
      </div>
      {line.kind !== "none" && (
        <Link href={`/releases/${line.number}`} className="shrink-0 rounded-lg border border-border bg-surface px-2.5 py-1 text-[12.5px] font-semibold text-fg hover:bg-subtle">
          {t("open")}
        </Link>
      )}
    </div>
  );
}
