"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, Bell, ChevronDown, FolderOpen, Home, Inbox, Keyboard, List, ListTodo, MoreHorizontal, Rocket, Settings, SlidersHorizontal, TriangleAlert, UserRound, LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";
import { PROJECT_COLORS } from "@/lib/project-colors";
import type { CurrentMember } from "@/server/session";
import type { ProjectLite } from "./app-context";


/** Keys handled in app-shell.tsx. Keep this list in step with that file. */
const SHORTCUTS = [
  ["⌘ K", "search"],
  ["C", "create"],
  ["G H", "home"],
  ["G I", "inbox"],
  ["G M", "myTasks"],
  ["G T", "tasks"],
  ["G P", "projects"],
] as const;

function Badge({ n, tone, label }: { n: number; tone: "blue" | "grey" | "red"; label?: string }) {
  if (!n) return null;
  return (
    <span aria-label={label} className={cn("tabular ms-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] px-1.5 text-[11px] font-semibold", tone === "blue" && "bg-accent text-white", tone === "grey" && "bg-sunken text-fg-secondary", tone === "red" && "bg-danger text-white")}>
      {n}
    </span>
  );
}

function NavItem({ href, icon: Icon, label, active, badge, tone = "grey", danger, activeDanger, badgeLabel }: { href: string; icon: typeof Home; label: string; active: boolean; badge?: number; tone?: "blue" | "grey" | "red"; danger?: boolean; activeDanger?: boolean; badgeLabel?: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2.5 rounded-[7px] px-2.5 text-[13.5px] font-medium text-fg hover:bg-black/[0.04]",
        active && !activeDanger && "bg-info-subtle font-semibold text-[#1d4ed8] hover:bg-info-subtle",
        danger && "font-semibold text-danger-text",
        activeDanger && "bg-danger-subtle font-semibold text-danger-text hover:bg-danger-subtle",
      )}
    >
      <Icon size={16} aria-hidden className={cn("shrink-0", danger && "text-danger-text")} />
      <span className="truncate">{label}</span>
      <Badge n={badge ?? 0} tone={tone} label={badgeLabel} />
    </Link>
  );
}

const Section = ({ children }: { children: React.ReactNode }) => <div className="px-2.5 pb-1 pt-2.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-muted">{children}</div>;

/** Figma shows six projects in the sidebar; the rest live on the Projects page. */
const SIDEBAR_PROJECTS = 6;

export function Sidebar({ me, counts, projects, hasIncident, roleLabel }: { me: CurrentMember; counts: { unread: number; waiting: number; triage: number }; projects: ProjectLite[]; hasIncident: boolean; roleLabel: string }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const [shortcuts, setShortcuts] = useState(false);
  const isAbg = me.side === "abg";
  const on = (href: string) => pathname === href || pathname.startsWith(href + "/");
  return (
    <nav aria-label={t("mainNav")} className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col gap-0.5 border-e border-border bg-subtle px-2.5 py-3 md:flex">
      <Link href="/home" className="flex items-center gap-2.5 px-1.5 pb-2.5 pt-1">
        <span className="grid h-[26px] w-[26px] place-items-center rounded-[7px] bg-fg font-mono text-[9.5px] font-medium text-white">V×A</span>
        <span className="text-[14px] font-semibold">Vendoor × ABG</span>
        <ChevronDown size={14} aria-hidden className="ms-auto text-fg-muted" />
      </Link>
      <div className="h-2.5" />
      <Section>{t("personal")}</Section>
      {isAbg ? (
        <>
          <NavItem href="/home" icon={Home} label={t("dashboard")} active={on("/home")} />
          <NavItem href="/requests" icon={Inbox} label={t("triage")} active={on("/requests")} badge={counts.triage} tone="blue" badgeLabel={t("triageCount", { count: counts.triage })} />
        </>
      ) : (
        <NavItem href="/inbox" icon={Inbox} label={t("inbox")} active={on("/inbox")} badge={counts.unread} tone="blue" badgeLabel={t("unread", { count: counts.unread })} />
      )}
      <NavItem href="/my-work" icon={UserRound} label={t("myTasks")} active={on("/my-work")} badge={counts.waiting} badgeLabel={t("waitingOnMe", { count: counts.waiting })} />
      <div className="h-2.5" />
      <Section>{t("work")}</Section>
      <NavItem href="/projects" icon={FolderOpen} label={t("projects")} active={pathname === "/projects"} />
      {projects.slice(0, SIDEBAR_PROJECTS).map((p, i) => (
        <Link key={p.id} href={`/projects/${p.key}`} aria-current={on(`/projects/${p.key}`) ? "page" : undefined} className={cn("flex h-7 items-center gap-2.5 rounded-[7px] ps-7 pe-2.5 text-[13px] font-medium text-fg-secondary hover:bg-black/[0.04]", on(`/projects/${p.key}`) && "bg-info-subtle font-semibold text-[#1d4ed8]")}>
          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: PROJECT_COLORS[i % PROJECT_COLORS.length] }} />
          <span className="truncate">{p.name}</span>
        </Link>
      ))}
      {projects.length > SIDEBAR_PROJECTS && (
        <Link href="/projects" className="flex h-7 items-center ps-[38px] text-[12.5px] text-fg-muted hover:text-fg">
          {t("moreProjects", { count: projects.length - SIDEBAR_PROJECTS })}
        </Link>
      )}
      <NavItem href="/tasks" icon={List} label={t("allTasks")} active={on("/tasks")} />
      <NavItem href="/reports" icon={BarChart3} label={t("reports")} active={on("/reports")} />
      <NavItem href="/releases" icon={Rocket} label={t("releases")} active={on("/releases")} />
      <NavItem href="/trouble" icon={TriangleAlert} label={t("trouble")} active={on("/trouble")} danger={hasIncident} activeDanger={hasIncident && on("/trouble")} badge={hasIncident ? 1 : 0} tone="red" />
      <div className="min-h-px flex-1" />
      <NavItem href="/settings/profile" icon={Settings} label={t("settings")} active={on("/settings")} />
      <div className="h-1" />
      <Menu>
        <MenuTrigger className="flex h-[50px] w-full items-center gap-2.5 rounded-lg border border-border bg-surface p-2 text-start">
          <Avatar30 name={me.name} />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold leading-tight">{me.name}</span>
            <span className="block truncate text-[11.5px] text-fg-muted">{roleLabel}</span>
          </span>
          <MoreHorizontal size={15} aria-hidden className="ms-auto text-fg-muted" />
        </MenuTrigger>
        <MenuContent side="top" align="start" className="w-[240px]">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Avatar30 name={me.name} />
            <span className="min-w-0">
              <span className="block truncate text-ui font-semibold">{me.name}</span>
              <span className="block truncate text-meta text-fg-muted">{me.email}</span>
            </span>
          </div>
          <MenuSeparator />
          <MenuItem onSelect={() => router.push("/settings/profile")}>
            <UserRound size={14} aria-hidden />
            {t("yourProfile")}
          </MenuItem>
          <MenuItem onSelect={() => router.push("/settings/notifications")}>
            <Bell size={14} aria-hidden />
            {t("notificationSettings")}
          </MenuItem>
          <MenuItem onSelect={() => router.push("/settings/general")}>
            <SlidersHorizontal size={14} aria-hidden />
            {t("languageTimezone")}
          </MenuItem>
          <MenuItem onSelect={() => setShortcuts(true)}>
            <Keyboard size={14} aria-hidden />
            {t("shortcuts")}
          </MenuItem>
          <MenuSeparator />
          <MenuItem className="text-danger-text" onSelect={() => authClient.signOut().then(() => window.location.assign("/sign-in"))}>
            <LogOut size={14} aria-hidden />
            {t("signOut")}
          </MenuItem>
        </MenuContent>
      </Menu>
      <Dialog open={shortcuts} onOpenChange={setShortcuts}>
        {shortcuts && (
          <DialogContent title={t("shortcuts")}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-ui">
              {SHORTCUTS.map(([keys, label]) => (
                <div key={keys} className="contents">
                  <dt>
                    <kbd className="rounded border border-border bg-canvas px-1.5 py-0.5 font-mono text-meta">{keys}</kbd>
                  </dt>
                  <dd className="text-fg-secondary">{t(`shortcut.${label}` as "shortcut.search")}</dd>
                </div>
              ))}
            </dl>
          </DialogContent>
        )}
      </Dialog>
    </nav>
  );
}

function Avatar30({ name }: { name: string }) {
  return (
    <span aria-hidden className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-accent text-[13px] font-semibold text-white">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
