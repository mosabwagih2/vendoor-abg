import { getTranslations } from "next-intl/server";
import { Lock } from "lucide-react";
import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { SettingsHeader } from "@/components/layout/settings-header";
import { statusGroup, STATUS_GROUPS, type StatusGroup } from "@/domain/status-display";
import { CUSTOM_GROUPS } from "@/domain/custom-status";
import { can } from "@/domain/policy";
import { WorkflowEditor } from "./workflow-editor";
import { MOVE_RULES } from "@/domain/workflow-rules";
import type { TaskStatus } from "@/domain/types";

export const metadata = { title: "Workflow settings" };

/** Figma 5.1: the five steps with live counts, and who is allowed to move a task between them. */
export default async function WorkflowPage() {
  const me = await requireMember();
  const t = await getTranslations("settings.workflow");
  const ts = await getTranslations("statusGroup");
  const grouped = await db.task.groupBy({ by: ["status"], where: { archivedAt: null }, _count: true });
  const counts = Object.fromEntries(STATUS_GROUPS.map((g) => [g, 0])) as Record<StatusGroup, number>;
  for (const r of grouped) {
    const g = statusGroup(r.status as TaskStatus);
    if (g) counts[g] += r._count;
  }
  const [custom, customGroups] = await Promise.all([db.customStatus.findMany({ orderBy: [{ stepGroup: "asc" }, { position: "asc" }] }), db.task.groupBy({ by: ["customStatusId"], where: { archivedAt: null, customStatusId: { not: null } }, _count: true })]);
  const customCounts = new Map(customGroups.map((c) => [c.customStatusId, c._count]));
  return (
    <>
      <SettingsHeader title={t("title")} hint={t("hint")} />
      <WorkflowEditor
        steps={STATUS_GROUPS.map((g) => ({
          group: g,
          label: ts(g),
          count: counts[g],
          customizable: CUSTOM_GROUPS.includes(g),
          custom: custom.filter((c) => c.stepGroup === g).map((c) => ({ id: c.id, name: c.name, color: c.color, count: customCounts.get(c.id) ?? 0 })),
        }))}
        canEdit={can(me, "manage_sla")}
      />

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
