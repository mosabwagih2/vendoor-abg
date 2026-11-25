import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import type { IncidentState } from "@/domain/incident";

const TONE: Record<IncidentState, string> = {
  investigating: "bg-danger-subtle text-danger-text",
  identified: "bg-warning-subtle text-warning-text",
  monitoring: "bg-info-subtle text-[#1d4ed8]",
  resolved: "bg-success-subtle text-success-strong",
};

/** Coloured pill for an incident's state (Investigating, Cause found, Monitoring, Fixed). */
export function StatePill({ state }: { state: IncidentState }) {
  const t = useTranslations("trouble.state");
  return <span className={cn("rounded-full px-2 py-0.5 text-meta font-semibold", TONE[state])}>{t(state)}</span>;
}
