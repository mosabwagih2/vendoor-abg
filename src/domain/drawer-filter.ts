/** Filters for the notifications drawer (Figma 6.6): everything, what needs me, and system problems. */
export type DrawerFilter = "all" | "needs_me" | "system";
export const DRAWER_FILTERS: DrawerFilter[] = ["all", "needs_me", "system"];

export interface FilterableItem {
  /** Incident number, set only for system problems. */
  incident: number | null;
}

/** `needsMe` is decided by the caller, because it depends on what the viewer is allowed to do on the task. */
export function filterDrawer<T extends FilterableItem>(items: T[], filter: DrawerFilter, needsMe: (item: T) => boolean): T[] {
  if (filter === "system") return items.filter((i) => i.incident !== null);
  if (filter === "needs_me") return items.filter((i) => i.incident === null && needsMe(i));
  return items;
}

export function countsFor<T extends FilterableItem>(items: T[], needsMe: (item: T) => boolean): Record<DrawerFilter, number> {
  return { all: items.length, needs_me: filterDrawer(items, "needs_me", needsMe).length, system: filterDrawer(items, "system", needsMe).length };
}
