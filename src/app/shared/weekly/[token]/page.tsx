import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { verifyShareToken } from "@/server/report-share";
import { weeklyReport, weeklySummary } from "@/server/weekly-report";
import { weekRangeLabel, weekTitle } from "@/domain/weekly-text";
import { deltaVs } from "@/domain/week";

export const metadata = { title: "Weekly report", robots: { index: false, follow: false } };

/** Read-only weekly report for people without an account. The signed link is the only way in, and it expires after 7 days. */
export default async function SharedWeeklyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const week = verifyShareToken(token);
  if (!week) notFound();
  const t = await getTranslations("weekly");
  const [report, summary] = await Promise.all([weeklyReport(week), weeklySummary(week)]);
  const cards = (["requested", "completed", "done", "released", "incidents"] as const).map((k) => ({ k, value: report.totals[k], delta: deltaVs(report.totals[k], report.previous[k]) }));
  return (
    <main className="min-h-dvh bg-canvas">
      <header className="flex h-14 items-center gap-2.5 px-6">
        <span className="grid h-7 w-7 place-items-center rounded-control bg-primary font-mono text-[10px] font-bold text-primary-fg">V×A</span>
        <span className="text-ui font-semibold">Vendoor × ABG</span>
      </header>
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-16 pt-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em]">{t("title")}</h1>
          <p className="text-ui text-fg-secondary">
            {weekTitle(summary.start)} · {weekRangeLabel(summary.start, summary.end)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {cards.map((c) => (
            <div key={c.k} className="rounded-card border border-border bg-surface p-4">
              <div className="text-ui text-fg-secondary">{t(`card.${c.k}`)}</div>
              <div className="tabular mt-1 text-kpi font-semibold">{c.value}</div>
              <div className="mt-1 text-meta text-fg-muted">{c.delta.direction === "same" ? t("same") : t("vsLast", { diff: `${c.delta.diff > 0 ? "+" : ""}${c.delta.diff}` })}</div>
            </div>
          ))}
        </div>
        <Section title={t("shared.cameBack")} empty={t("shared.none")} items={summary.cameBackBroken.map((x) => `${x.key} ${x.title}`)} />
        <Section title={t("shared.waiting")} empty={t("shared.none")} items={summary.waitingCheck} />
        <Section title={t("shared.asks")} empty={t("shared.none")} items={summary.asks.map((x) => `${x.key} ${x.title}`)} />
        <p className="text-meta text-fg-muted">{t("shared.note")}</p>
      </div>
    </main>
  );
}

function Section({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <section className="rounded-card border border-border bg-surface p-4">
      <h2 className="text-ui font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-1 text-ui text-fg-secondary">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-ui">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
