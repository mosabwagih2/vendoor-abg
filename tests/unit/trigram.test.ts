import { describe, expect, it } from "vitest";
import { rankSimilar, similarity, trigrams } from "@/domain/trigram";
// similarity() values taken from PostgreSQL 16 + pg_trgm on the seeded task titles: [query, title, similarity].
import pg from "./fixtures/pg-trgm-similarity.json";

describe("trigram similarity matches pg_trgm", () => {
  it("gives the same trigrams as show_trgm for plain text", () => {
    expect([...trigrams("a-b c_d 12x!!")].sort()).toEqual(["  1", "  a", "  b", "  c", "  d", " 12", " a ", " b ", " c ", " d ", "12x", "2x "].sort());
  });

  it.each(pg as Array<[string, string, number]>)("%s ~ %s", (q, title, sim) => {
    expect(similarity(title, q)).toBeCloseTo(sim, 5);
  });

  it("is 0 when either side has no letters or digits", () => {
    expect(similarity("!!", "abc")).toBe(0);
    expect(similarity("", "")).toBe(0);
  });
});

describe("rankSimilar", () => {
  const rows = [
    { key: "A-1", title: "Account ve5372 will not open" },
    { key: "A-2", title: "Thermal label unclear" },
    { key: "A-3", title: "Order entry is slow" },
  ];
  it("keeps similar titles, most similar first", () => {
    expect(rankSimilar(rows, "Account will not open").map((r) => r.key)).toEqual(["A-1"]);
  });
  it("keeps titles that contain the text even below the threshold, ignoring case", () => {
    expect(rankSimilar(rows, "LABEL").map((r) => r.key)).toEqual(["A-2"]);
  });
  it("returns at most the limit", () => {
    expect(rankSimilar([...rows, ...rows, ...rows], "o", 2)).toHaveLength(2);
  });
});
