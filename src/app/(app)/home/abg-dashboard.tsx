import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Calendar } from "lucide-react";
import { PriorityIcon } from "@/components/icons/priority-icon";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { dueLabel } from "@/domain/due-label";
import { shortAge } from "@/lib/format";
import { STATUS_GROUPS, type StatusGroup } from "@/domain/status-display";
import type { Dashboard, DashTask } from "@/server/dashboard";

const DOT: Record<StatusGroup, string> = { request: "#8b5cf6", processing: "#f59e0b", stuck: "#e5484d", completed: "#2563eb", done: "#16a06a" };

/** Figma 2.1: ABG home. Status counts, overall progress, due soon, who has what, and what waits on Vendoor. */
export async function AbgDashboard({ data, greeting, dateLine }: { data: Dashboard; greeting: string; dateLine: string }) {
  const t = await getTranslations("dashboard");
  const ts = await getTranslations("statusGroup");
  const tr = await getTranslations("roles");
  const now = new Date();
  const peak = Math.max(1, ...data.people.map((p) => p.open));
  return (
    <div className="mx-auto max-w-[1180px] space-y-5 px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] font-bold leading-[1.25] tracking-[-0.02em]">{greeting}</h1>
          <p className="mt-0.5 text-ui text-fg-secondary">{dateLine} · {t("waitingTriage", { count: data.triage })}</p>
        </div>
        <Link href="/reports/weekly" className={cn(buttonVariants({ variant: "secondary", size: "md" }))}>
          <Calendar size={14} aria-hidden />
          {t("thisWeek")}
        </Link>
        <Link href="/requests" className={cn(buttonVariants({ variant: "primary", size: "md" }), "bg-accent text-white")}>
          {t("openTriage")}
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {STATUS_GROUPS.map((g) => (
          <Link key={g} href={`/tasks?status=${g === "processing" ? "planned,in_progress,reopened" : g === "request" ? "triage" : g === "stuck" ? "needs_info" : g === "completed" ? "shipped" : "done"}&closed=1`} className="rounded-card border border-border bg-surface p-4 hover:border-border-strong">
            <div className="flex items-center gap-2 text-ui text-fg-secondary">
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: DOT[g] }} />
              {ts(g)}
            </div>
            <div className="tabular mt-1 text-[32px] font-semibold leading-tight">{data.counts[g]}</div>
            <div className="text-meta text-fg-muted">{t(`hint.${g}`)}</div>
          </Link>
        ))}
      </div>

      <section className="rounded-card border border-border bg-surface p-4" aria-label={t("overall")}>
        <h2 className="text-ui font-semibold">
          {t("overall")} <span className="ms-1 font-normal text-fg-muted">{t("overallLine", { total: data.total, done: data.counts.done })}</span>
        </h2>
        <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full">
          {STATUS_GROUPS.map((g) => (
            <span key={g} style={{ background: DOT[g], flexGrow: data.counts[g] }} className="min-w-px" />
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={t("dueSoon")} count={data.dueSoon.length} href="/tasks?due=week">
          {data.dueSoon.map((x) => (
            <TaskLine key={x.key} task={x} trailing={<DueText task={x} now={now} />} />
          ))}
        </Panel>

        <Panel title={t("whoHasWhat")} hint={t("people", { count: data.people.length })} href="/tasks?group=assignee">
          {data.people.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <Avatar name={p.name} size={32} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-ui font-medium">{p.name}</div>
                <div className="text-meta text-fg-muted">{tr(p.role as "abg_lead")}</div>
              </div>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-subtle" aria-hidden>
                <div className="h-full rounded-full bg-accent" style={{ width: `${(p.open / peak) * 100}%` }} />
              </div>
              <span className="tabular w-6 text-end text-ui font-semibold">{p.open}</span>
            </div>
          ))}
          {data.unassigned > 0 && (
            <div className="flex items-center gap-3 bg-warning-subtle px-4 py-2.5 text-ui text-warning-text">
              <span className="flex-1">{t("noAssignee", { count: data.unassigned })}</span>
              <Link href="/tasks?assignee=none" className="rounded-control border border-[#f3d98b] bg-white px-3 py-1 text-ui font-semibold">
                {t("assign")}
              </Link>
            </div>
          )}
        </Panel>

        <Panel title={t("waitingVendoor")} count={data.waitingTotal} href="/tasks?waiting=vendoor">
          {data.waitingOnVendoor.map((x) => {
            const days = Math.floor((now.getTime() - new Date(x.statusChangedAt).getTime()) / 86_400_000);
            return <TaskLine key={x.key} task={x} trailing={<span suppressHydrationWarning className={cn("text-meta", days >= 3 ? "font-semibold text-danger-text" : "text-fg-muted")}>{shortAge(x.statusChangedAt, now)}</span>} />;
          })}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, count, hint, href, children }: { title: string; count?: number; hint?: string; href: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <h2 className="text-ui font-semibold">{title}</h2>
        {count !== undefined && <span className="text-meta text-fg-muted">{count}</span>}
        {hint && <span className="text-meta text-fg-muted">{hint}</span>}
        <Link href={href} className="ms-auto text-meta font-medium text-accent hover:underline">
          View all
        </Link>
      </header>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function TaskLine({ task, trailing }: { task: DashTask; trailing: React.ReactNode }) {
  return (
    <Link href={`/tasks/${task.key}`} className="flex items-center gap-2.5 px-4 py-2.5 text-ui hover:bg-subtle">
      <PriorityIcon priority={task.priority} />
      <span className="shrink-0 font-mono text-meta text-fg-secondary">{task.key}</span>
      <span className="min-w-0 flex-1 truncate">{task.title}</span>
      {trailing}
    </Link>
  );
}

async function DueText({ task, now }: { task: DashTask; now: Date }) {
  const t = await getTranslations("dashboard");
  const l = task.dueAt ? dueLabel(new Date(task.dueAt), now) : null;
  if (!l) return null;
  const text = l.kind === "late" ? t("late", { days: l.days }) : l.kind === "today" ? t("today") : l.kind === "tomorrow" ? t("tomorrow") : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "Africa/Cairo" }).format(l.at);
  return <span className={cn("shrink-0 text-meta", l.kind === "late" ? "font-semibold text-danger-text" : l.kind === "today" ? "font-semibold text-warning-text" : "text-fg-secondary")}>{text}</span>;
}
