import type { TaskStatus } from "@/domain/types";

// PRD 9.2 status icons. Colour is never the only signal: each status has its own shape, and callers render the label too.
const COLOR: Record<TaskStatus, string> = {
  triage: "var(--status-triage)",
  needs_info: "var(--status-needs-info)",
  planned: "var(--status-planned)",
  in_progress: "var(--status-in-progress)",
  shipped: "var(--status-shipped)",
  reopened: "var(--status-reopened)",
  done: "var(--status-done)",
  closed: "var(--status-closed)",
};

export function StatusIcon({ status, size = 14, label }: { status: TaskStatus; size?: number; label?: string }) {
  const c = COLOR[status];
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  const common = { width: size, height: size, viewBox: "0 0 16 16", fill: "none", ...a11y } as const;
  switch (status) {
    case "triage": // dashed circle
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.25" stroke={c} strokeWidth="1.5" strokeDasharray="2.2 2.2" />
        </svg>
      );
    case "needs_info": // circle with question mark
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.25" stroke={c} strokeWidth="1.5" />
          <path d="M6.3 6.3a1.75 1.75 0 1 1 2.4 1.6c-.45.2-.7.55-.7 1.05v.3" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="11.1" r=".8" fill={c} />
        </svg>
      );
    case "planned": // empty circle
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.25" stroke={c} strokeWidth="1.5" />
        </svg>
      );
    case "in_progress": // half-filled
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.25" stroke={c} strokeWidth="1.5" />
          <path d="M8 3.5a4.5 4.5 0 0 1 0 9z" fill={c} />
        </svg>
      );
    case "shipped": // three-quarter
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.25" stroke={c} strokeWidth="1.5" />
          <path d="M8 3.5A4.5 4.5 0 1 1 3.5 8H8z" fill={c} />
        </svg>
      );
    case "reopened": // circular arrow
      return (
        <svg {...common}>
          <path d="M12.6 5.6A5.25 5.25 0 1 0 13.25 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M13.4 2.6v3.3h-3.3" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "done": // filled with check
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="7" fill={c} />
          <path d="m5.2 8.2 1.9 1.9 3.8-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "closed": // circle with slash
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.25" stroke={c} strokeWidth="1.5" />
          <path d="m4 12 8-8" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
  }
}
