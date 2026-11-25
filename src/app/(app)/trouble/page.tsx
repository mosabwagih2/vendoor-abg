import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { formatExact, relative } from "@/lib/format";

export const metadata = { title: "Trouble" };

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600 * 1000);

const STATE_TONE: Record<string, string> = {
  investigating: "bg-danger-subtle text-danger-text",
  identified: "bg-warning-subtle text-warning-text",
  monitoring: "bg-info-subtle text-[#1d4ed8]",
  resolved: "bg-success-subtle text-success-strong",
};

/** System problems (down or slow), kept apart from bugs. Open ones also show as the banner on every page. */
export default async function TroublePage() {
  await requireMember();
  const t = await getTranslations("trouble");
  const since = daysAgo(60);
  const incidents = await db.incident.findMany({ where: { archivedAt: null, startedAt: { gte: since } }, orderBy: { startedAt: "desc" } });
  const open = incidents.filter((i) => i.state !== "resolved");
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="mx-auto max-w-3xl space-y-3 p-4 md:p-6">
        {!incidents.length && <EmptyState title={t("none")} />}
        {open.length > 0 && <h2 className="text-meta font-semibold uppercase tracking-[0.06em] text-fg-muted">{t("ongoing")}</h2>}
        {[...open, ...incidents.filter((i) => i.state === "resolved")].map((i) => (
          <Link key={i.id} href={`/trouble/${i.number}`} className="block rounded-card border border-border bg-surface p-4 hover:border-border-strong">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-meta text-fg-muted">INC-{i.number}</span>
              <span className={`rounded-full px-2 py-0.5 text-meta font-semibold ${STATE_TONE[i.state]}`}>{t(`state.${i.state}`)}</span>
              <span suppressHydrationWarning className="ms-auto text-meta text-fg-muted" title={formatExact(i.startedAt)}>{relative(i.startedAt)}</span>
            </div>
            <h3 className="mt-1.5 text-heading font-semibold">{i.title}</h3>
            {i.summary && <p className="mt-1 text-ui text-fg-secondary">{i.summary}</p>}
            {i.state === "resolved" && (i.impact || i.resolution) && (
              <dl className="mt-3 grid gap-2 rounded-control bg-subtle p-3 text-ui sm:grid-cols-2">
                {i.impact && (
                  <div>
                    <dt className="text-meta font-semibold uppercase tracking-[0.06em] text-fg-muted">{t("impact")}</dt>
                    <dd>{i.impact}</dd>
                  </div>
                )}
                {i.resolution && (
                  <div>
                    <dt className="text-meta font-semibold uppercase tracking-[0.06em] text-fg-muted">{t("resolution")}</dt>
                    <dd>{i.resolution}</dd>
                  </div>
                )}
              </dl>
            )}
          </Link>
        ))}
      </div>
    </>
  );
}
