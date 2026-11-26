/** Incident rules shared by the form (client) and the server action. Pure, no I/O. */
export const INCIDENT_STATES = ["investigating", "identified", "monitoring", "resolved"] as const;
export type IncidentState = (typeof INCIDENT_STATES)[number];

export const TIMELINE_KINDS = ["reported", "alert_sent", "acknowledged", "status", "update", "resolved"] as const;
export type TimelineKind = (typeof TIMELINE_KINDS)[number];

export interface ClosingForm {
  summary: string;
  impact: string;
  resolution: string;
}

export type ClosingProblem = keyof ClosingForm;

/** Figma 6.3: ABG cannot close an incident until all three parts are written. */
export function closingProblems(f: ClosingForm): ClosingProblem[] {
  return (["summary", "impact", "resolution"] as const).filter((k) => f[k].trim().length < 3);
}

/** Allowed next states. Resolving goes through the closing form, so it is not offered here. */
export function nextStates(current: IncidentState): IncidentState[] {
  return INCIDENT_STATES.filter((s) => s !== "resolved" && s !== current && current !== "resolved");
}

/** Whole minutes between start and end (or now). Never negative. */
export function durationMinutes(startedAt: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - startedAt.getTime()) / 60_000));
}

/** "45 min", "2 h 10 min", "1 d 3 h". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) {
    const m = minutes % 60;
    return `${Math.floor(minutes / 60)} h${m ? ` ${m} min` : ""}`;
  }
  const h = Math.floor((minutes % 1440) / 60);
  return `${Math.floor(minutes / 1440)} d${h ? ` ${h} h` : ""}`;
}

// ───────────── reporting a problem (Figma 7.3) ─────────────

export const INCIDENT_KINDS = ["down", "slow", "other"] as const;
export type IncidentKind = (typeof INCIDENT_KINDS)[number];
export const INCIDENT_AFFECTED = ["everyone", "vendoor", "one"] as const;
export type IncidentAffected = (typeof INCIDENT_AFFECTED)[number];

/** The incident title shown on the banner and the Trouble list. */
export function incidentTitle(kind: IncidentKind): string {
  return kind === "down" ? "System is down" : kind === "slow" ? "System is slow" : "System problem";
}

/** Joins a link onto the end of the description, one per line, without duplicating it. */
export function appendLink(text: string, url: string): string {
  const link = url.trim();
  if (!link || text.includes(link)) return text;
  return text.trim() ? `${text.trim()}\n${link}` : link;
}

/** A link must be http(s). Anything else is dropped so the timeline never carries javascript: URLs. */
export function isSafeLink(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
