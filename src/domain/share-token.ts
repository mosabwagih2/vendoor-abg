/** Public share links for the weekly report. The token carries the week and an expiry; the signature is added and checked on the server. */
export const SHARE_DAYS = 7;

export interface ShareParts {
  week: string;
  /** Expiry as epoch seconds. */
  exp: number;
}

export const shareExpiry = (now: Date, days = SHARE_DAYS) => Math.floor(now.getTime() / 1000) + days * 86_400;

/** The text that gets signed. */
export const shareMessage = (p: ShareParts) => `weekly:${p.week}:${p.exp}`;

export const formatToken = (p: ShareParts, sig: string) => `${p.week}.${p.exp}.${sig}`;

/** Splits a token into its parts. Returns null for anything that is not shaped like one. */
export function parseToken(token: string): (ShareParts & { sig: string }) | null {
  const m = /^(\d{4}-\d{2}-\d{2})\.(\d{9,12})\.([A-Za-z0-9_-]{20,64})$/.exec(token);
  return m ? { week: m[1], exp: Number(m[2]), sig: m[3] } : null;
}

export const isExpired = (p: ShareParts, now: Date) => p.exp * 1000 < now.getTime();
