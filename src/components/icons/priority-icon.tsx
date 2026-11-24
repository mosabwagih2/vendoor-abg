import type { Priority } from "@/domain/types";

// PRD 9.2 priority icons: Urgent = filled square with "!", High/Medium/Low = 3/2/1 bars.
export function PriorityIcon({ priority, size = 14, label, suggested }: { priority: Priority | null; size?: number; label?: string; suggested?: boolean }) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  const common = { width: size, height: size, viewBox: "0 0 16 16", ...a11y } as const;
  if (!priority)
    return (
      <svg {...common} fill="none">
        <path d="M3 8h2M7 8h2M11 8h2" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  if (priority === "urgent")
    return (
      <svg {...common} opacity={suggested ? 0.55 : 1}>
        <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="var(--priority-urgent)" />
        <path d="M8 4.5v4.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8" cy="11.6" r="1" fill="#fff" />
      </svg>
    );
  const bars = priority === "high" ? 3 : priority === "medium" ? 2 : 1;
  const color = `var(--priority-${priority})`;
  return (
    <svg {...common} opacity={suggested ? 0.55 : 1}>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={2 + i * 4.5} y={10 - i * 3.5} width="3" height={4 + i * 3.5} rx="1" fill={i < bars ? color : "var(--border-default)"} />
      ))}
    </svg>
  );
}
