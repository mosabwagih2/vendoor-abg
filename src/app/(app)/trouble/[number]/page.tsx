import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { PageHeader } from "@/components/layout/page-header";
import { IncidentTimeline } from "@/components/trouble/incident-timeline";
import { IncidentControls } from "@/components/trouble/incident-controls";
import { StatePill } from "@/components/trouble/state-pill";
import { durationMinutes, formatDuration, type IncidentState } from "@/domain/incident";
import { formatExact } from "@/lib/format";

export const metadata = { title: "Incident" };

/** Figma 6.2/6.3: one system problem with its timeline, and (for ABG) the controls to update or close it. */
export default async function IncidentPage({ params }: { params: Promise<{ number: string }> }) {
  const me = await requireMember();
  const { number } = await params;
  const n = Number(number.replace(/^INC-/i, ""));
  if (!Number.isInteger(n)) notFound();
  const incident = await db.incident.findUnique({ where: { number: n }, include: { timeline: { orderBy: { at: "asc" } } } });
  if (!incident || incident.archivedAt) notFound();
  const t = await getTranslations("trouble");
  const authors = await db.member.findMany({ where: { id: { in: [...new Set(incident.timeline.map((e) => e.authorId))] } }, select: { id: true, name: true } });
  const name = new Map(authors.map((a) => [a.id, a.name]));
  const state = incident.state as IncidentState;
  const end = incident.resolvedAt ?? new Date();
  return (
    <>
      <PageHeader title={`INC-${incident.number} · ${incident.title}`}>
        <Link href="/trouble" className="inline-flex items-center gap-1 text-ui text-fg-secondary hover:text-fg">
          <ArrowLeft size={14} aria-hidden />
          {t("title")}
        </Link>
      </PageHeader>
      <div className="mx-auto grid max-w-5xl gap-6 p-4 md:grid-cols-[1fr_280px] md:p-6">
        <div className="space-y-6">
          <section className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatePill state={state} />
              <span suppressHydrationWarning className="text-meta text-fg-muted">
                {t("startedAt", { when: formatExact(incident.startedAt) })} · {t("lasted", { duration: formatDuration(durationMinutes(incident.startedAt, end)) })}
              </span>
            </div>
            <p className="text-ui text-fg-secondary">{incident.scope}</p>
          </section>
          {state === "resolved" && (
            <section aria-label={t("closing")} className="grid gap-3 rounded-card border border-[#bfe5d2] bg-success-subtle p-4 text-ui sm:grid-cols-3">
              {(["summary", "impact", "resolution"] as const).map((k) => (
                <div key={k}>
                  <h2 className="text-meta font-semibold uppercase tracking-[0.06em] text-fg-muted">{t(k)}</h2>
                  <p className="mt-1 whitespace-pre-wrap">{incident[k]}</p>
                </div>
              ))}
            </section>
          )}
          <section aria-label={t("timeline")}>
            <h2 className="mb-3 text-meta font-semibold uppercase tracking-[0.06em] text-fg-muted">{t("timeline")}</h2>
            <IncidentTimeline entries={incident.timeline.map((e) => ({ id: e.id, kind: e.kind, body: e.body, at: e.at.toISOString(), author: name.get(e.authorId) ?? "" }))} />
          </section>
        </div>
        {state !== "resolved" && (
          <aside>
            <IncidentControls incidentId={incident.id} state={state} side={me.side} />
          </aside>
        )}
      </div>
    </>
  );
}
