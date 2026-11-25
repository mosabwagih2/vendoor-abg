import { describe, expect, it } from "vitest";
import { releaseLine, showReleaseLine, type ReleaseInfo } from "@/domain/release-line";

const base: ReleaseInfo = { number: "R-2026-11-22", state: "released", releasedAt: "2026-11-22T14:10:00Z", deployedBy: "Ahmed Shiha", rollbackReason: null };

describe("release line", () => {
  it("is empty without a release", () => expect(releaseLine(null)).toEqual({ kind: "none" }));
  it("is live once released, with who and when", () => expect(releaseLine(base)).toEqual({ kind: "live", number: "R-2026-11-22", at: "2026-11-22T14:10:00Z", by: "Ahmed Shiha" }));
  it("is a draft before deploy", () => expect(releaseLine({ ...base, state: "upcoming" })).toEqual({ kind: "draft", number: "R-2026-11-22" }));
  it("keeps the reason after a rollback", () => expect(releaseLine({ ...base, state: "rolled_back", rollbackReason: "Broke printing" })).toEqual({ kind: "rolled_back", number: "R-2026-11-22", reason: "Broke printing" }));
});

describe("who sees the line", () => {
  it("shows ABG every state", () => {
    for (const l of [releaseLine(null), releaseLine({ ...base, state: "upcoming" }), releaseLine(base)]) expect(showReleaseLine(l, "abg")).toBe(true);
  });
  it("hides drafts and empty lines from Vendoor", () => {
    expect(showReleaseLine(releaseLine(null), "vendoor")).toBe(false);
    expect(showReleaseLine(releaseLine({ ...base, state: "upcoming" }), "vendoor")).toBe(false);
    expect(showReleaseLine(releaseLine(base), "vendoor")).toBe(true);
  });
});
