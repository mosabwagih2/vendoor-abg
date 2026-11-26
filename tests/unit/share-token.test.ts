import { describe, expect, it } from "vitest";
import { formatToken, isExpired, parseToken, shareExpiry, shareMessage } from "@/domain/share-token";

const now = new Date("2026-11-26T12:00:00Z");
const SIG = "abcdefghijklmnopqrstuv";

describe("share token", () => {
  it("expires after seven days", () => {
    const exp = shareExpiry(now);
    expect(isExpired({ week: "2026-11-21", exp }, new Date(now.getTime() + 6 * 86_400_000))).toBe(false);
    expect(isExpired({ week: "2026-11-21", exp }, new Date(now.getTime() + 8 * 86_400_000))).toBe(true);
  });
  it("round-trips", () => {
    const parts = { week: "2026-11-21", exp: shareExpiry(now) };
    expect(parseToken(formatToken(parts, SIG))).toEqual({ ...parts, sig: SIG });
  });
  it("rejects malformed tokens", () => {
    for (const bad of ["", "x", "2026-11-21.123.abc", "../../etc.1234567890." + SIG, "2026-11-21.1234567890"]) expect(parseToken(bad)).toBeNull();
  });
  it("signs week and expiry together", () => expect(shareMessage({ week: "2026-11-21", exp: 5 })).toBe("weekly:2026-11-21:5"));
});
