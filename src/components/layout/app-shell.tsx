"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FolderOpen, Inbox, List, Plus, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { AppContext, type MemberLite, type ProjectLite } from "./app-context";
import { NewRequestDialog } from "@/components/forms/new-request";
import { useLiveRefresh } from "./live-refresh";
import { WorkflowProvider } from "@/components/task/workflow-actions";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { IncidentBanner } from "./incident-banner";
import type { CurrentMember } from "@/server/session";

interface Props {
  me: CurrentMember;
  counts: { unread: number; waiting: number; triage: number };
  projects: ProjectLite[];
  members: MemberLite[];
  incident: { id: string; number: number; title: string; startedAt: string } | null;
  upcoming: Array<{ id: string; number: string }>;
  children: React.ReactNode;
}

type NewOpts = { parentId?: string; projectId?: string; incident?: boolean };

/** App frame from the Figma design: 232 px sidebar, 52 px topbar, optional incident banner, white content. Phone gets a bottom tab bar. */
export function AppShell({ me, counts, projects, members, incident, upcoming, children }: Props) {
  const t = useTranslations("nav");
  const tr = useTranslations("roles");
  const pathname = usePathname();
  const router = useRouter();
  const [newOpen, setNewOpen] = useState(false);
  const [newOpts, setNewOpts] = useState<NewOpts>({});
  const [newKey, setNewKey] = useState(0);
  useLiveRefresh();

  const openNewRequest = useCallback((opts: NewOpts = {}) => {
    setNewOpts(opts);
    setNewKey((k) => k + 1);
    setNewOpen(true);
  }, []);

  // Keyboard: C new request, G then H/I/M/R/T/P to navigate.
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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, openNewRequest]);

  const ctx = useMemo(() => ({ me, members, projects, openNewRequest }), [me, members, projects, openNewRequest]);
  const on = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const tabs = [
    { href: me.side === "abg" ? "/requests" : "/inbox", label: me.side === "abg" ? t("triage") : t("inbox"), icon: Inbox, badge: me.side === "abg" ? counts.triage : counts.unread },
    { href: "/my-work", label: t("myTasks"), icon: List, badge: 0 },
    null,
    { href: "/projects", label: t("projects"), icon: FolderOpen, badge: 0 },
    { href: "/trouble", label: t("trouble"), icon: TriangleAlert, badge: 0, danger: true },
  ];

  return (
    <AppContext value={ctx}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="flex h-dvh bg-surface">
        <Sidebar me={me} counts={counts} projects={projects} hasIncident={!!incident} roleLabel={tr(me.role)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onCreate={() => openNewRequest()} unread={counts.unread} />
          {incident && <IncidentBanner incident={incident} />}
          <main id="main" className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-16 md:pb-0">
            <WorkflowProvider releases={upcoming}>{children}</WorkflowProvider>
          </main>
        </div>

        {/* Phone: Inbox, Tasks, Create, Projects, Trouble (Figma mobile tab bar) */}
        <nav aria-label={t("mainNav")} className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-t border-border bg-surface pb-1 md:hidden">
          {tabs.map((it) =>
            it ? (
              <Link key={it.href} href={it.href} aria-current={on(it.href) ? "page" : undefined} className={cn("relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium", it.danger ? "text-danger" : on(it.href) ? "text-accent" : "text-fg-muted")}>
                <it.icon size={22} aria-hidden />
                {it.label}
                {!!it.badge && <span className="absolute start-1/2 top-1 ms-2 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">{it.badge}</span>}
              </Link>
            ) : (
              <button key="create" type="button" onClick={() => openNewRequest()} aria-label={t("newRequest")} className="flex items-center justify-center">
                <span className="grid h-11 w-[52px] place-items-center rounded-2xl bg-accent text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)]">
                  <Plus size={24} aria-hidden />
                </span>
              </button>
            ),
          )}
        </nav>
      </div>
      <NewRequestDialog key={newKey} open={newOpen} onOpenChange={setNewOpen} opts={newOpts} />
    </AppContext>
  );
}
