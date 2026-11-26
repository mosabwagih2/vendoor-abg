import "server-only";
import { db } from "./db";
import { sendEmail } from "./email";
import { createShareToken } from "./report-share";
import { weeklySummary } from "./weekly-report";
import { getWorkspaceConfig } from "./calendar";
import { localDateKey } from "@/domain/sla";
import { dueWeeklySend } from "@/domain/weekly-schedule";
import { weeklyText, weekTitle } from "@/domain/weekly-text";

/** Emails the report text and a 7-day link to every active ABG lead. Used by the "Send to ABG by email" button and by the automatic send. */
export async function sendWeeklyReportEmails(weekStartKey: string): Promise<number> {
  const [summary, leads] = await Promise.all([weeklySummary(weekStartKey), db.member.findMany({ where: { status: "active", role: "abg_lead" }, select: { email: true } })]);
  const text = weeklyText(summary);
  const url = `${process.env.APP_URL ?? "http://localhost:3000"}/shared/weekly/${createShareToken(weekStartKey)}`;
  for (const l of leads) await sendEmail({ to: l.email, subject: `Weekly report · ${weekTitle(weekStartKey)}`, line: text, actionLabel: "Open the full report", actionUrl: url });
  return leads.length;
}

/** Called by the worker every few minutes. Sends once per work week, on Thursday when the work day ends. Returns the week sent, or null. */
export async function autoSendWeeklyReport(now = new Date()): Promise<string | null> {
  const [cfg, ws] = await Promise.all([getWorkspaceConfig(), db.workspace.findFirstOrThrow({ select: { id: true, weeklyReportAuto: true, weeklyReportSentWeek: true } })]);
  const tz = cfg.calendar.tz;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")!.value) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")!.value);
  const week = dueWeeklySend({ localDate: localDateKey(now, tz), localMinutes: hour * 60 + minute, endMin: cfg.calendar.endMin, enabled: ws.weeklyReportAuto, lastSentWeek: ws.weeklyReportSentWeek });
  if (!week) return null;
  // Claim the week first so two workers (or a restart) cannot both send it.
  const claimed = await db.workspace.updateMany({ where: { id: ws.id, OR: [{ weeklyReportSentWeek: null }, { weeklyReportSentWeek: { not: week } }] }, data: { weeklyReportSentWeek: week } });
  if (claimed.count === 0) return null;
  try {
    await sendWeeklyReportEmails(week);
  } catch (e) {
    // Give the week back so the next run tries again instead of silently skipping the report.
    await db.workspace.update({ where: { id: ws.id }, data: { weeklyReportSentWeek: ws.weeklyReportSentWeek } });
    throw e;
  }
  return week;
}
