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
