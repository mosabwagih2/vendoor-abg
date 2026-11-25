import { getTranslations } from "next-intl/server";
import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { SettingsHeader } from "@/components/layout/settings-header";
import { PrioritiesForm } from "./priorities-form";
import { PRIORITIES } from "@/domain/types";

export const metadata = { title: "Priorities" };

export default async function PrioritiesPage() {
  await requireMember();
  const t = await getTranslations("settings.priorities");
  const ws = await db.workspace.findFirstOrThrow({ include: { slaTargets: true } });
  const open = await db.task.groupBy({ by: ["priority"], where: { archivedAt: null, status: { notIn: ["done", "closed"] }, priority: { not: null } }, _count: true });
  return (
    <>
      <SettingsHeader title={t("title")} hint={t("hint")} />
      <PrioritiesForm
        rows={PRIORITIES.map((p) => {
          const x = ws.slaTargets.find((s) => s.priority === p);
          return { priority: p, firstResponseMinutes: x?.firstResponseMinutes ?? 60, resolutionMinutes: x?.resolutionMinutes ?? null, open: open.find((o) => o.priority === p)?._count ?? 0 };
        })}
      />
    </>
  );
}
