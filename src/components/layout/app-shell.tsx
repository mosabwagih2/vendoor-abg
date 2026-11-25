"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  Home,
  Inbox,
  UserRound,
  ListTodo,
  Rows3,
  FolderKanban,
  Rocket,
  Settings,
  Plus,
  Search,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  MoreHorizontal,
  AlertOctagon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Menu, MenuContent, MenuItem, MenuTrigger, MenuSeparator, MenuLabel } from "@/components/ui/menu";
import { authClient } from "@/lib/auth-client";
import { relative } from "@/lib/format";
import { AppContext, type MemberLite, type ProjectLite } from "./app-context";
import { NewRequestDialog } from "@/components/forms/new-request";
import { useLiveRefresh } from "./live-refresh";
import { WorkflowProvider } from "@/components/task/workflow-actions";
import type { CurrentMember } from "@/server/session";

function subscribeCollapsed(cb: () => void) {
  window.addEventListener("sidebar-collapsed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("sidebar-collapsed", cb);
    window.removeEventListener("storage", cb);
  };
}
function readCollapsed() {
  try {
    return localStorage.getItem("sidebar-collapsed") === "1";
  } catch {
    return false;
  }
}

interface Props {
  me: CurrentMember;
  counts: { unread: number; waiting: number; triage: number };
  projects: ProjectLite[];
  members: MemberLite[];
  incident: { id: string; number: number; title: string; startedAt: string } | null;
  upcoming: Array<{ id: string; number: string }>;
  children: React.ReactNode;
}

export function AppShell({ me, counts, projects, members, incident, upcoming, children }: Props) {
  const t = useTranslations("nav");
  const tr = useTranslations("roles");
  const th = useTranslations("home");
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const setCollapsed = (v: boolean) => {
    try {
      localStorage.setItem("sidebar-collapsed", v ? "1" : "0");
    } catch {}
    window.dispatchEvent(new Event("sidebar-collapsed"));
  };
  const [newOpen, setNewOpen] = useState(false);
  const [newOpts, setNewOpts] = useState<{ parentId?: string; projectId?: string; incident?: boolean }>({});
  const [newKey, setNewKey] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  useLiveRefresh();


  const openNewRequest = useCallback((opts: { parentId?: string; projectId?: string; incident?: boolean } = {}) => {
    setNewOpts(opts);
    setNewKey((k) => k + 1);
    setNewOpen(true);
  }, []);

  // Keyboard: C new request, / search, G then H/I/M/R/T/P to navigate (PRD 5.1, 9.5).
  useEffect(() => {
    let g = 0;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable=true], [role=dialog]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (Date.now() - g < 1000) {
        const map: Record<string, string> = { h: "/home", i: "/inbox", m: "/my-work", r: "/requests", t: "/tasks", p: "/projects" };
        if (map[k]) {
          e.preventDefault();
          router.push(map[k]);
        }
        g = 0;
        return;
      }
      if (k === "g") g = Date.now();
      else if (k === "c") {
        e.preventDefault();
        openNewRequest();
      } else if (k === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, openNewRequest]);

  const ctx = useMemo(() => ({ me, members, projects, openNewRequest }), [me, members, projects, openNewRequest]);

  const groups: Array<{ label?: string; items: Array<{ href: string; label: string; icon: typeof Home; badge?: number; badgeLabel?: string; hint?: string }> }> = [
    {
      label: t("personal"),
      items: [
        { href: "/home", label: t("home"), icon: Home, hint: "G H" },
        { href: "/inbox", label: t("inbox"), icon: Inbox, badge: counts.unread, badgeLabel: t("unread", { count: counts.unread }), hint: "G I" },
        { href: "/my-work", label: t("myWork"), icon: UserRound, badge: counts.waiting, badgeLabel: t("waitingOnMe", { count: counts.waiting }), hint: "G M" },
      ],
    },
    {
      label: t("work"),
      items: [
        { href: "/requests", label: t("requests"), icon: ListTodo, badge: me.side === "abg" ? counts.triage : undefined, badgeLabel: t("triageCount", { count: counts.triage }), hint: "G R" },
        { href: "/tasks", label: t("tasks"), icon: Rows3, hint: "G T" },
        { href: "/projects", label: t("projects"), icon: FolderKanban, hint: "G P" },
      ],
    },
    { label: t("records"), items: [{ href: "/releases", label: t("releases"), icon: Rocket }] },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <AppContext value={ctx}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="flex min-h-dvh bg-canvas">
        {/* Sidebar (desktop) */}
        <nav
          aria-label={t("mainNav")}
          className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col md:flex", collapsed ? "w-14" : "w-60")}
        >
          <div className={cn("flex h-12 items-center gap-2 px-3", collapsed && "justify-center px-0")}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-primary font-mono text-[10px] font-semibold text-primary-fg">V×A</div>
            {!collapsed && <span className="truncate text-ui font-semibold">Vendoor × ABG</span>}
            <button
              type="button"
              aria-label={collapsed ? t("expand") : t("collapse")}
              onClick={() => setCollapsed(!collapsed)}
              className={cn("ms-auto rounded-control p-1 text-fg-secondary hover:bg-border/60 hover:text-fg", collapsed && "hidden")}
            >
              <PanelLeftClose size={16} aria-hidden />
            </button>
          </div>
          {collapsed && (
            <button type="button" aria-label={t("expand")} onClick={() => setCollapsed(false)} className="mx-auto mb-2 rounded-control p-1.5 text-fg-secondary hover:bg-border/60">
              <PanelLeftOpen size={16} aria-hidden />
            </button>
          )}
          <div className={cn("space-y-1.5 px-2", collapsed && "px-1.5")}>
            {!collapsed && (
              <form
                role="search"
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = searchRef.current?.value.trim();
                  router.push(q ? `/tasks?q=${encodeURIComponent(q)}&closed=1` : "/tasks");
                }}
                className="relative"
              >
                <Search size={14} className="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 text-fg-secondary" aria-hidden />
                <input
                  ref={searchRef}
                  aria-label={t("search")}
                  placeholder={t("search")}
                  className="h-9 w-full rounded-control border border-border bg-surface ps-8 pe-9 text-ui placeholder:text-fg-secondary"
                />
                <kbd className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-fg-secondary">/</kbd>
              </form>
            )}
            <button
              type="button"
              onClick={() => openNewRequest()}
              className={cn("flex h-9 w-full items-center gap-2 rounded-control bg-primary px-3 text-ui font-semibold text-primary-fg shadow-[0_1px_2px_rgba(0,0,0,0.18)] hover:opacity-90", collapsed && "justify-center px-0")}
              aria-label={t("newRequest")}
            >
              <Plus size={16} aria-hidden />
              {!collapsed && <span>{t("newRequest")}</span>}
              {!collapsed && <kbd className="ms-auto font-mono text-[10px] opacity-60">C</kbd>}
            </button>
          </div>
          <div className="mt-3 flex-1 overflow-y-auto px-2">
            {groups.map((g, gi) => (
              <div key={gi} className="mb-3">
                {g.label && !collapsed && <div className="px-2 pb-1 text-meta font-medium text-fg-secondary">{g.label}</div>}
                <ul className="space-y-0.5">
                  {g.items.map((it) => (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        aria-current={isActive(it.href) ? "page" : undefined}
                        title={collapsed ? it.label : it.hint}
                        className={cn(
                          "flex h-9 items-center gap-2.5 rounded-control px-2.5 text-ui text-fg-secondary hover:bg-black/[0.04] hover:text-fg",
                          isActive(it.href) && "bg-surface font-semibold text-fg shadow-[0_0_0_1px_var(--border-default),0_1px_3px_rgba(21,22,26,0.06)]",
                          collapsed && "justify-center px-0",
                        )}
                      >
                        <it.icon size={16} aria-hidden className="shrink-0" />
                        {!collapsed && <span className="truncate">{it.label}</span>}
                        {!!it.badge && (
                          <span
                            aria-label={it.badgeLabel}
                            className={cn("tabular ms-auto min-w-5 rounded-full bg-waiting-strong px-1.5 text-center text-[11px] font-semibold leading-5 text-white", collapsed && "absolute ms-5 -mt-4 scale-90")}
                          >
                            {it.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border p-2">
            <Link
              href="/settings/profile"
              aria-current={pathname.startsWith("/settings") ? "page" : undefined}
              className={cn("mb-1 flex h-8 items-center gap-2 rounded-control px-2 text-ui text-fg-secondary hover:bg-border/50 hover:text-fg", collapsed && "justify-center px-0", pathname.startsWith("/settings") && "bg-surface text-fg")}
            >
              <Settings size={16} aria-hidden />
              {!collapsed && t("settings")}
            </Link>
            <ProfileMenu me={me} collapsed={collapsed} roleLabel={tr(me.role)} signOutLabel={t("signOut")} />
          </div>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col md:p-2 md:ps-0">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface md:h-[calc(100dvh-16px)] md:rounded-panel md:border md:border-border md:shadow-panel">
          {incident && (
            <div role="alert" suppressHydrationWarning className="flex items-center gap-2 bg-danger px-4 py-2 text-ui font-medium text-white">
              <AlertOctagon size={16} aria-hidden />
              {th("openIncident", { title: `INC-${incident.number} ${incident.title}`, age: relative(incident.startedAt) })}
            </div>
          )}
          <main id="main" className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-16 md:pb-0">
            <WorkflowProvider releases={upcoming}>{children}</WorkflowProvider>
          </main>
          </div>
        </div>

        {/* Mobile bottom bar: Home, Inbox, New, Tasks, More (PRD 5.1) */}
        <nav aria-label={t("mainNav")} className="fixed inset-x-0 bottom-0 z-30 grid h-14 grid-cols-5 border-t border-border bg-surface md:hidden">
          {[
            { href: "/home", label: t("home"), icon: Home },
            { href: "/inbox", label: t("inbox"), icon: Inbox, badge: counts.unread },
          ].map((it) => (
            <Link key={it.href} href={it.href} aria-current={isActive(it.href) ? "page" : undefined} className={cn("relative flex flex-col items-center justify-center gap-0.5 text-[11px] text-fg-secondary", isActive(it.href) && "text-fg")}>
              <it.icon size={20} aria-hidden />
              {it.label}
              {!!it.badge && <span className="absolute top-1.5 start-1/2 ms-2 min-w-4 rounded-full bg-waiting-strong px-1 text-center text-[10px] font-semibold leading-4 text-white">{it.badge}</span>}
            </Link>
          ))}
          <button type="button" onClick={() => openNewRequest()} className="flex flex-col items-center justify-center gap-0.5 text-[11px] text-fg" aria-label={t("newRequest")}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-fg">
              <Plus size={18} aria-hidden />
            </span>
          </button>
          <Link href="/tasks" aria-current={isActive("/tasks") ? "page" : undefined} className={cn("flex flex-col items-center justify-center gap-0.5 text-[11px] text-fg-secondary", isActive("/tasks") && "text-fg")}>
            <Rows3 size={20} aria-hidden />
            {t("tasks")}
          </Link>
          <Menu>
            <MenuTrigger className="flex flex-col items-center justify-center gap-0.5 text-[11px] text-fg-secondary">
              <MoreHorizontal size={20} aria-hidden />
              {t("more")}
            </MenuTrigger>
            <MenuContent align="end" side="top">
              {[
                ["/my-work", t("myWork")],
                ["/requests", t("requests")],
                ["/projects", t("projects")],
                ["/releases", t("releases")],
                ["/settings/profile", t("settings")],
              ].map(([href, label]) => (
                <MenuItem key={href} onSelect={() => router.push(href)}>
                  {label}
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuItem onSelect={() => authClient.signOut().then(() => window.location.assign("/sign-in"))}>{t("signOut")}</MenuItem>
            </MenuContent>
          </Menu>
        </nav>
      </div>
      <NewRequestDialog key={newKey} open={newOpen} onOpenChange={setNewOpen} opts={newOpts} />
    </AppContext>
  );
}

function ProfileMenu({ me, collapsed, roleLabel, signOutLabel }: { me: CurrentMember; collapsed: boolean; roleLabel: string; signOutLabel: string }) {
  return (
    <Menu>
      <MenuTrigger className={cn("flex h-10 w-full items-center gap-2 rounded-control px-2 text-start hover:bg-border/50", collapsed && "justify-center px-0")}>
        <Avatar name={me.name} size={24} />
        {!collapsed && (
          <span className="min-w-0">
            <span className="block truncate text-ui font-medium">{me.name}</span>
            <span className="block truncate text-meta text-fg-secondary">{roleLabel}</span>
          </span>
        )}
      </MenuTrigger>
      <MenuContent side="top" align="start">
        <MenuLabel>{me.email}</MenuLabel>
        <MenuSeparator />
        <MenuItem onSelect={() => authClient.signOut().then(() => window.location.assign("/sign-in"))}>
          <LogOut size={14} aria-hidden />
          {signOutLabel}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
