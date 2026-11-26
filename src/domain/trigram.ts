/**
 * Trigram similarity, the same measure as PostgreSQL's pg_trgm `similarity()`, so possible duplicates match
 * the way they did on PostgreSQL. MySQL has no trigram function, so it runs here instead.
 *
 * pg_trgm: lower-case the text, split it into words of letters and digits, pad each word with two spaces in front
 * and one behind, take every 3-character slice, and keep the distinct ones. Similarity is
 * shared trigrams / all distinct trigrams of both (0 when either side has none).
 */
const WORD = /[\p{L}\p{N}]+/gu;

export function trigrams(text: string): Set<string> {
  const out = new Set<string>();
  for (const word of text.toLowerCase().match(WORD) ?? []) {
    const chars = Array.from(`  ${word} `);
    for (let i = 0; i + 3 <= chars.length; i++) out.add(chars[i] + chars[i + 1] + chars[i + 2]);
  }
  return out;
}

export function similarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / (ta.size + tb.size - shared);
}

/** Matches pg_trgm's default threshold used by the duplicate check. */
export const DUPLICATE_THRESHOLD = 0.18;

/**
 * The rows whose title is similar to `title` (above the threshold) or contains it (case-insensitive),
 * most similar first, at most `limit`.
 */
export function rankSimilar<T extends { title: string }>(rows: T[], title: string, limit = 5): Array<T & { sim: number }> {
  const needle = title.toLowerCase();
  return rows
    .map((r) => ({ ...r, sim: similarity(r.title, title) }))
    .filter((r) => r.sim > DUPLICATE_THRESHOLD || r.title.toLowerCase().includes(needle))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, limit);
}
