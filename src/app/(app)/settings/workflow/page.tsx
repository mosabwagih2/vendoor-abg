import { getTranslations } from "next-intl/server";
import { Lock } from "lucide-react";
import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { SettingsHeader } from "@/components/layout/settings-header";
import { statusGroup, STATUS_GROUPS, type StatusGroup } from "@/domain/status-display";
import { MOVE_RULES } from "@/domain/workflow-rules";
import type { TaskStatus } from "@/domain/types";

export const metadata = { title: "Workflow settings" };

const DOT: Record<StatusGroup, string> = { request: "#8b5cf6", processing: "#f59e0b", stuck: "#e5484d", completed: "#2563eb", done: "#16a06a" };

/** Figma 5.1: the five steps with live counts, and who is allowed to move a task between them. */
export default async function WorkflowPage() {
  await requireMember();
  const t = await getTranslations("settings.workflow");
  const ts = await getTranslations("statusGroup");
  const grouped = await db.task.groupBy({ by: ["status"], where: { archivedAt: null }, _count: true });
  const counts = Object.fromEntries(STATUS_GROUPS.map((g) => [g, 0])) as Record<StatusGroup, number>;
  for (const r of grouped) {
    const g = statusGroup(r.status as TaskStatus);
    if (g) counts[g] += r._count;
  }
  return (
    <>
      <SettingsHeader title={t("title")} hint={t("hint")} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {STATUS_GROUPS.map((g) => (
          <div key={g} className="rounded-card bg-canvas p-3">
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
              {t(`step.${g}`)}
              {g === "done" && <Lock size={11} aria-label={t("locked")} />}
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-control border border-border bg-surface px-2.5 py-2 text-ui font-medium">
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: DOT[g] }} />
              <span className="flex-1">{ts(g)}</span>
              <span className="tabular text-meta text-fg-muted">{counts[g]}</span>
            </div>
            <p className="mt-2 text-meta text-fg-muted">{t(`owner.${g}`)}</p>
          </div>
        ))}
      </div>

      <section className="mt-5 overflow-hidden rounded-card border border-border bg-surface" aria-label={t("who")}>
        <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 text-ui font-semibold">
          <Lock size={14} aria-hidden /> {t("who")}
        </h2>
        <ul className="divide-y divide-border">
          {MOVE_RULES.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-ui">
              <span className="basis-64 font-medium">
                {ts(r.from)} → {ts(r.to)}
              </span>
              <span className={r.side === "abg" ? "rounded-control bg-subtle px-2 py-0.5 text-meta font-medium" : "rounded-control bg-info-subtle px-2 py-0.5 text-meta font-medium text-[#1d4ed8]"}>{t(`side.${r.side}`)}</span>
              <span className="text-fg-secondary">{t(`rule.${r.id}`)}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
