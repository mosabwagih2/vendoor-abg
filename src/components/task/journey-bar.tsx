import { useTranslations } from "next-intl";
import type { TaskStatus } from "@/domain/types";

const STEP: Record<TaskStatus, number> = { triage: 0, needs_info: 0, planned: 1, in_progress: 2, reopened: 2, shipped: 3, done: 4, closed: 4 };
const COLOR: Record<TaskStatus, string> = {
  triage: "var(--status-triage)",
  needs_info: "var(--status-needs-info)",
  planned: "var(--status-planned)",
  in_progress: "var(--status-in-progress)",
  shipped: "var(--status-shipped)",
  reopened: "var(--status-reopened)",
  done: "var(--status-done)",
  closed: "var(--status-closed)",
};

/**
 * Five-segment journey bar: Triage → Planned → In progress → Shipped → Done.
 * Steps before the current one are ink, the current one takes its status color, later ones are empty.
 * It carries a text alternative so color is never the only signal.
 */
export function JourneyBar({ status, width = 96 }: { status: TaskStatus; width?: number }) {
  const t = useTranslations();
  const cur = STEP[status];
  return (
    <span role="img" aria-label={t("journey.label", { step: cur + 1, status: t(`status.${status}`) })} className="inline-flex shrink-0 items-center gap-[3px]" style={{ width }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="h-1 flex-1 rounded-full" style={{ background: i < cur ? "var(--text-primary)" : i === cur ? COLOR[status] : "var(--border-default)" }} />
      ))}
    </span>
  );
}

const STEPS: Array<{ key: TaskStatus; side: "abg" | "vendoor" }> = [
  { key: "triage", side: "abg" },
  { key: "planned", side: "abg" },
  { key: "in_progress", side: "abg" },
  { key: "shipped", side: "vendoor" },
  { key: "done", side: "vendoor" },
];

/** Large journey with step names and who owns each step; used in the task header. */
export function JourneyStepper({ status }: { status: TaskStatus }) {
  const t = useTranslations();
  const cur = STEP[status];
  return (
    <ol className="grid grid-cols-5 gap-1.5" aria-label={t("journey.label", { step: cur + 1, status: t(`status.${status}`) })}>
      {STEPS.map((s, i) => {
        const isCur = i === cur;
        return (
          <li key={s.key} className="min-w-0" aria-current={isCur ? "step" : undefined}>
            <span className="block h-1.5 rounded-full" style={{ background: i < cur ? "var(--text-primary)" : isCur ? COLOR[status] : "var(--border-default)" }} />
            <span className={`mt-1.5 block truncate text-[11.5px] ${isCur ? "font-semibold text-fg" : i < cur ? "text-fg-secondary" : "text-fg-secondary/80"}`}>{t(`status.${s.key}`)}</span>
            <span className="block truncate text-[10.5px] text-fg-secondary/80">{s.side === "abg" ? "ABG" : "Vendoor"}</span>
          </li>
        );
      })}
    </ol>
  );
}
