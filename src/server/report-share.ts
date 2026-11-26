import "server-only";
import { hmac, safeEqual } from "./crypto";
import { formatToken, isExpired, parseToken, shareExpiry, shareMessage } from "@/domain/share-token";

/** A link anyone can open for seven days, without signing in. Only the week is exposed, and the link cannot be edited to show another one. */
export function createShareToken(week: string, now = new Date()): string {
  const parts = { week, exp: shareExpiry(now) };
  return formatToken(parts, hmac(shareMessage(parts)));
}

/** The week a valid, unexpired token points to, or null. */
export function verifyShareToken(token: string, now = new Date()): string | null {
  const p = parseToken(token);
  if (!p || isExpired(p, now)) return null;
  return safeEqual(p.sig, hmac(shareMessage(p))) ? p.week : null;
}
