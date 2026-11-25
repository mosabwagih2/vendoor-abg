"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as D from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { Clock, FileText, Folder, Plus, Search, TriangleAlert, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { countsByKind, filterItems, matchActions, moveSelection, pushRecent, type PaletteFilter, type PaletteItem } from "@/domain/palette";
import { searchPaletteAction } from "@/server/actions/misc";

const RECENT_KEY = "tracker.recent";
const read = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
};

const ICON = { recent: Clock, task: FileText, project: Folder, person: User, action: Plus } as const;

/** Figma 5.9: ⌘K palette with Recent, Tasks, Projects, People and Actions. Arrow keys move, Enter opens. */
export function CommandPalette({ open, onOpenChange, onAction }: { open: boolean; onOpenChange: (o: boolean) => void; onAction: (a: "new_request" | "new_incident") => void }) {
  const t = useTranslations("palette");
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<PaletteFilter>("all");
  const [found, setFound] = useState<PaletteItem[]>([]);
  const [sel, setSel] = useState(0);
  const seq = useRef(0);

  const actions: PaletteItem[] = useMemo(
    () => [
      { id: "new", kind: "action", title: t("createRequest"), subtitle: t("createRequestHint"), action: "new_request", shortcut: "C" },
      { id: "incident", kind: "action", title: t("reportProblem"), subtitle: t("reportProblemHint"), action: "new_incident" },
    ],
    [t],
  );

  // Search as the user types. Late answers from older queries are dropped.
  useEffect(() => {
    if (!open) return;
    const mine = ++seq.current;
    const id = setTimeout(async () => {
      const r = await searchPaletteAction(q, read());
      if (mine !== seq.current || !r.ok || !r.data) return;
      setFound([...r.data.recents, ...r.data.tasks, ...r.data.projects, ...r.data.people] as PaletteItem[]);
      setSel(0);
    }, 120);
    return () => clearTimeout(id);
  }, [q, open]);

  const all = useMemo(() => [...found, ...matchActions(actions, q)], [found, actions, q]);
  const counts = countsByKind(all);
  const shown = filterItems(all, filter);
  const groups = (["recent", "task", "project", "person", "action"] as const).map((k) => ({ kind: k, items: shown.filter((i) => i.kind === k) })).filter((g) => g.items.length);

  function choose(item: PaletteItem | undefined, newTab = false) {
    if (!item) return;
    onOpenChange(false);
    if (item.action) return onAction(item.action);
    if (item.kind === "task" || item.kind === "recent") {
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(pushRecent(read(), item.id)));
      } catch {}
    }
    if (item.href) newTab ? window.open(item.href, "_blank") : router.push(item.href);
  }

  const tabs: Array<[PaletteFilter, string, number | null]> = [
    ["all", t("all"), null],
    ["tasks", t("tasks"), counts.tasks],
    ["projects", t("projects"), counts.projects],
    ["people", t("people"), counts.people],
    ["actions", t("actions"), null],
  ];
  let index = -1;
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-black/30" />
        <D.Content
          className="fixed start-1/2 top-[10vh] z-50 flex max-h-[80vh] w-[calc(100vw-24px)] max-w-[600px] -translate-x-1/2 flex-col overflow-hidden rounded-modal border border-border bg-surface shadow-[var(--shadow-pop)] focus:outline-none rtl:translate-x-1/2"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setSel((s) => moveSelection(s, e.key === "ArrowDown" ? 1 : -1, shown.length));
            } else if (e.key === "Enter") {
              e.preventDefault();
              choose(shown[sel], e.metaKey || e.ctrlKey);
            }
          }}
        >
          <D.Title className="sr-only">{t("title")}</D.Title>
          <D.Description className="sr-only">{t("hint")}</D.Description>
          <div className="flex items-center gap-3 px-4 pt-3.5">
            <Search size={18} className="text-fg-muted" aria-hidden />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("placeholder")} aria-label={t("title")} style={{ outline: "none", boxShadow: "none", border: 0 }} className="h-8 min-w-0 flex-1 bg-transparent text-[16px] placeholder:text-fg-muted" />
            <kbd className="rounded border border-border px-1.5 text-meta text-fg-muted">Esc</kbd>
          </div>
          <div role="tablist" className="flex gap-1.5 px-4 py-3">
            {tabs.map(([k, label, n]) => (
              <button key={k} role="tab" type="button" aria-selected={filter === k} onClick={() => { setFilter(k); setSel(0); }} className={cn("h-7 rounded-full px-3 text-[12.5px] font-medium", filter === k ? "bg-fg text-white" : "bg-subtle text-fg-secondary hover:bg-border")}>
                {label}
                {n ? ` ${n}` : ""}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-border" role="listbox" aria-label={t("title")}>
            {groups.length === 0 ? (
              <p className="p-8 text-center text-ui text-fg-secondary">{t("none")}</p>
            ) : (
              groups.map((g) => (
                <div key={g.kind}>
                  <div className="px-4 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-muted">{t(`group.${g.kind}`)}</div>
                  {g.items.map((it) => {
                    index += 1;
                    const mine = index;
                    const Icon = it.id === "incident" ? TriangleAlert : ICON[it.kind];
                    return (
                      <div key={`${g.kind}-${it.id}`} role="option" aria-selected={sel === mine} onMouseMove={() => setSel(mine)} onClick={() => choose(it)} className={cn("flex cursor-pointer items-center gap-3 border-s-2 px-4 py-2", sel === mine ? "border-accent bg-info-subtle" : "border-transparent")}>
                        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-control bg-subtle", it.id === "incident" ? "text-danger" : "text-fg-secondary")}>
                          <Icon size={15} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-ui font-medium", sel === mine && "text-accent")}>{it.title}</span>
                          <span className="block truncate text-meta text-fg-muted">{it.subtitle}</span>
                        </span>
                        {it.shortcut && <kbd className="rounded border border-border px-1.5 text-meta text-fg-muted">{it.shortcut}</kbd>}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          <div className="hidden items-center gap-4 border-t border-border bg-canvas px-4 py-2 text-meta text-fg-muted sm:flex">
            <span>↑↓ {t("move")}</span>
            <span>↵ {t("open")}</span>
            <span>⌘↵ {t("openTab")}</span>
            <span>Esc {t("close")}</span>
            <span className="ms-auto">{t("results", { count: shown.length })}</span>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
