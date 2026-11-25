import { useTranslations } from "next-intl";
import { AlertTriangle, BellRing, CheckCircle2, CircleDot, MessageSquare, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";

export interface TimelineItem {
  id: string;
  kind: string;
  body: string;
  at: string;
  author: string;
}

const ICON: Record<string, { icon: typeof CircleDot; tone: string }> = {
  reported: { icon: AlertTriangle, tone: "text-danger bg-danger-subtle" },
  alert_sent: { icon: BellRing, tone: "text-warning-text bg-warning-subtle" },
  acknowledged: { icon: CheckCircle2, tone: "text-[#1d4ed8] bg-info-subtle" },
  status: { icon: RefreshCw, tone: "text-[#1d4ed8] bg-info-subtle" },
  update: { icon: MessageSquare, tone: "text-fg-secondary bg-subtle" },
  resolved: { icon: CheckCircle2, tone: "text-success-strong bg-success-subtle" },
};

/** Typed, oldest-first timeline: reported, alert sent, status changes, updates, resolved. */
export function IncidentTimeline({ entries }: { entries: TimelineItem[] }) {
  const t = useTranslations("trouble.kind");
  return (
    <ol className="relative space-y-4 border-s border-border ps-6">
      {entries.map((e) => {
        const { icon: Icon, tone } = ICON[e.kind] ?? ICON.update;
        return (
          <li key={e.id} className="relative">
            <span className={cn("absolute -start-[37px] grid h-6 w-6 place-items-center rounded-full", tone)}>
              <Icon size={13} aria-hidden />
            </span>
            <div className="flex flex-wrap items-baseline gap-x-2 text-ui">
              <span className="font-semibold">{t(e.kind as "update")}</span>
              {e.author && <span className="text-fg-secondary">{e.author}</span>}
              <time suppressHydrationWarning dateTime={e.at} className="text-meta text-fg-muted">
                {formatDateTime(e.at)}
              </time>
            </div>
            {e.body && <p className="mt-0.5 whitespace-pre-wrap text-ui text-fg-secondary">{e.body}</p>}
          </li>
        );
      })}
    </ol>
  );
}
