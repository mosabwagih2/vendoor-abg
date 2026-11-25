/** Pure logic for the ⌘K palette: result items, tab filtering, keyboard movement. */
export type PaletteKind = "recent" | "task" | "project" | "person" | "action";
export type PaletteFilter = "all" | "tasks" | "projects" | "people" | "actions";

export interface PaletteItem {
  id: string;
  kind: PaletteKind;
  title: string;
  subtitle: string;
  href?: string;
  /** For actions that do something instead of navigating. */
  action?: "new_request" | "new_incident";
  shortcut?: string;
}

const FILTER_KINDS: Record<Exclude<PaletteFilter, "all">, PaletteKind> = { tasks: "task", projects: "project", people: "person", actions: "action" };

/** Items shown under a tab. "All" keeps recents; a specific tab shows only its own kind. */
export function filterItems(items: PaletteItem[], filter: PaletteFilter): PaletteItem[] {
  return filter === "all" ? items : items.filter((i) => i.kind === FILTER_KINDS[filter]);
}

export function countsByKind(items: PaletteItem[]): Record<Exclude<PaletteFilter, "all">, number> {
  return { tasks: items.filter((i) => i.kind === "task").length, projects: items.filter((i) => i.kind === "project").length, people: items.filter((i) => i.kind === "person").length, actions: items.filter((i) => i.kind === "action").length };
}

/** Arrow-key movement that wraps around. */
export function moveSelection(index: number, delta: 1 | -1, length: number): number {
  if (length <= 0) return 0;
  return (index + delta + length) % length;
}

/** Actions that match the query by words in their title. An empty query matches all. */
export function matchActions(actions: PaletteItem[], q: string): PaletteItem[] {
  const needle = q.trim().toLowerCase();
  return needle ? actions.filter((a) => a.title.toLowerCase().includes(needle)) : actions;
}

/** Keeps the last few opened items, newest first, no duplicates. */
export function pushRecent(list: string[], key: string, max = 5): string[] {
  return [key, ...list.filter((k) => k !== key)].slice(0, max);
}
