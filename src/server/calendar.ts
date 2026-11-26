import "server-only";
import { db } from "./db";
import { numberList } from "./json-list";
import { DEFAULT_CALENDAR, localDateKey, type WorkCalendar } from "@/domain/sla";
import type { Priority } from "@/domain/types";

export interface WorkspaceConfig {
  id: string;
  name: string;
  calendar: WorkCalendar;
  targets: Record<Priority, { firstResponse: number; resolution: number | null }>;
  atRiskPercentLeft: number;
  verifyReminderWorkingDays: number;
  unverifiedWorkingDays: number;
}

let cached: { at: number; value: WorkspaceConfig } | null = null;

export function invalidateWorkspaceConfig() {
  cached = null;
}

export async function getWorkspaceConfig(): Promise<WorkspaceConfig> {
  if (cached && Date.now() - cached.at < 30_000) return cached.value;
  const ws = await db.workspace.findFirstOrThrow({ include: { holidays: true, seasons: true, slaTargets: true } });
  const tz = ws.timezone;
  const targets = Object.fromEntries(
    ws.slaTargets.map((t) => [t.priority, { firstResponse: t.firstResponseMinutes, resolution: t.resolutionMinutes }]),
  ) as WorkspaceConfig["targets"];
  const value: WorkspaceConfig = {
    id: ws.id,
    name: ws.name,
    calendar: {
      ...DEFAULT_CALENDAR,
      tz,
      workingDays: numberList(ws.workingDays),
      startMin: ws.workDayStartMin,
      endMin: ws.workDayEndMin,
      holidays: ws.holidays.map((h) => h.date.toISOString().slice(0, 10)),
      seasons: ws.seasons.map((s) => ({
        start: s.startDate.toISOString().slice(0, 10),
        end: s.endDate.toISOString().slice(0, 10),
        startMin: s.startMin,
        endMin: s.endMin,
      })),
    },
    targets,
    atRiskPercentLeft: ws.slaAtRiskPercentLeft,
    verifyReminderWorkingDays: ws.verifyReminderWorkingDays,
    unverifiedWorkingDays: ws.unverifiedWorkingDays,
  };
  cached = { at: Date.now(), value };
  return value;
}

export function todayKey(cfg: WorkspaceConfig): string {
  return localDateKey(new Date(), cfg.calendar.tz);
}
