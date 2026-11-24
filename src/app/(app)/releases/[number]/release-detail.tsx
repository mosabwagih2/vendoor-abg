"use client";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { TaskRow, type TaskRowData } from "@/components/task/task-row";
import { Markdown } from "@/components/ui/markdown";
import { formatExact } from "@/lib/format";

export function ReleaseDetail({
  title,
  release,
  rows,
  regressed,
}: {
  title: string;
  release: { number: string; state: string; type: string; releasedAt: string | null; targetDate: string | null; notes: string; createdBy: string };
  rows: TaskRowData[];
  regressed: string[];
}) {
  const t = useTranslations("releases");
  const verified = rows.filter((r) => r.status === "done").length;
  const pending = rows.filter((r) => r.status === "shipped").length;
  const other = rows.length - verified - pending;
  return (
    <div>
      <PageHeader title={<span className="font-mono">{title}</span>} subtitle={`${t(release.type as "planned")} · ${release.releasedAt ? formatExact(release.releasedAt) : release.targetDate ? formatExact(release.targetDate) : ""} · ${release.createdBy}`} />
      <div className="mx-auto max-w-[1200px] space-y-5 px-4 py-5">
        <section className="rounded-card border border-border bg-surface p-4">
          <div className="flex flex-wrap gap-4 text-ui">
            <span>
              <b className="tabular">{verified}</b> {t("verified")}
            </span>
            <span>
              <b className="tabular">{pending}</b> {t("pending")}
            </span>
            <span>
              <b className="tabular">{regressed.length}</b> {t("regressed")}
            </span>
          </div>
          <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden>
            <div className="bg-st-done" style={{ flex: verified }} />
            <div className="bg-st-shipped" style={{ flex: pending }} />
            <div className="bg-st-reopened" style={{ flex: other }} />
          </div>
          {release.notes && (
            <div className="mt-4">
              <Markdown>{release.notes}</Markdown>
            </div>
          )}
        </section>
        <section className="overflow-hidden rounded-card border border-border bg-surface" aria-label={t("pickTasks")}>
          {rows.map((r) => (
            <TaskRow
              key={r.id}
              task={r}
              props={["priority", "waiting", "assignee"]}
              trailing={regressed.includes(r.id) ? <span className="rounded-full bg-danger-subtle px-2 text-meta font-medium text-danger">{t("regressed")}</span> : undefined}
            />
          ))}
        </section>
      </div>
    </div>
  );
}
