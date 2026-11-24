import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({ db: {} }));

describe("release numbering (FR-11.2)", async () => {
  const { releaseNumber } = await import("@/server/services/releases");
  it("uses R-YYYY-MM-DD", () => expect(releaseNumber("2026-11-22", [])).toBe("R-2026-11-22"));
  it("adds -2 for a second release the same day", () => expect(releaseNumber("2026-11-22", ["R-2026-11-22"])).toBe("R-2026-11-22-2"));
  it("adds -3 for a third", () => expect(releaseNumber("2026-11-22", ["R-2026-11-22", "R-2026-11-22-2"])).toBe("R-2026-11-22-3"));
});
