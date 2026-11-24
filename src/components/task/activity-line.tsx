"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { RelativeTime } from "@/components/ui/badges";
import type { FeedItem } from "@/server/activity-feed";

const KNOWN = new Set([
  "created", "status_changed", "verified", "reopened", "commented", "status_requested", "field_changed", "decision_changed", "description_edited",
  "occurrence_added", "relation_added", "relation_removed", "credential_added", "credential_updated", "credential_removed", "credential_viewed",
  "credential_copied", "credential_guard_override", "cancel_proposed", "release_recorded", "release_planned", "verify_reminder", "comment_edited",
  "incident_opened", "incident_resolved",
]);

export function useActivityText() {
  const t = useTranslations("activity");
  const ts = useTranslations("status");
  return (e: FeedItem) => {
    const verb = KNOWN.has(e.verb) ? e.verb : "other";
    const status = (v: unknown) => (typeof v === "string" && ["triage", "needs_info", "planned", "in_progress", "shipped", "reopened", "done", "closed"].includes(v) ? ts(v as "triage") : String(v ?? "—"));
    const field = e.field && t.has(`fields.${e.field}`) ? t(`fields.${e.field}` as "fields.priority") : (e.field ?? "");
    return t(verb as "created", { actor: e.actor ?? t("system"), key: e.key ?? "", from: status(e.from), to: status(e.to), field });
  };
}

export function ActivityLine({ e, linkKey = true }: { e: FeedItem; linkKey?: boolean }) {
  const text = useActivityText()(e);
  return (
    <li className="flex items-baseline gap-2 py-1.5 text-ui">
      <span className="min-w-0 flex-1 text-fg-secondary">
        {linkKey && e.key ? (
          <Link href={`/tasks/${e.key}`} className="hover:text-fg hover:underline">
            {text}
          </Link>
        ) : (
          text
        )}
      </span>
      <RelativeTime at={e.at} className="shrink-0 text-meta" />
    </li>
  );
}
