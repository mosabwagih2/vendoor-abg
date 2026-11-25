import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { SlaSettings } from "./sla-settings";

export const metadata = { title: "SLA and calendar" };

export default async function SlaPage() {
  await requireMember();
  const ws = await db.workspace.findFirstOrThrow({ include: { slaTargets: true, holidays: { orderBy: { date: "asc" } } } });
  return (
    <SlaSettings
      workingDays={ws.workingDays}
      startMin={ws.workDayStartMin}
      endMin={ws.workDayEndMin}
      targets={(["highest", "high", "medium", "low", "lowest"] as const).map((p) => {
        const x = ws.slaTargets.find((s) => s.priority === p)!;
        return { priority: p, firstResponseMinutes: x.firstResponseMinutes, resolutionMinutes: x.resolutionMinutes };
      })}
      holidays={ws.holidays.map((h) => ({ id: h.id, date: h.date.toISOString().slice(0, 10), name: h.name, certainty: h.certainty }))}
    />
  );
}
