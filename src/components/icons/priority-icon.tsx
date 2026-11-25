import type { Priority } from "@/domain/types";

// Jira-style priority marks (Figma): Highest ⏫ red, High ⌃ orange, Medium ═ amber, Low ⌄ blue, Lowest ⏬ grey.
export function PriorityIcon({ priority, size = 14, label, suggested }: { priority: Priority | null; size?: number; label?: string; suggested?: boolean }) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  const common = { width: size, height: size, viewBox: "0 0 16 16", fill: "none", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round", ...a11y } as const;
  const op = suggested ? 0.55 : 1;
  if (!priority)
    return (
      <svg {...common}>
        <path d="M3 8h2M7 8h2M11 8h2" stroke="var(--text-muted)" strokeWidth="1.5" />
      </svg>
    );
  const color = `var(--priority-${priority})`;
  switch (priority) {
    case "highest":
      return (
        <svg {...common} opacity={op} stroke={color}>
          <path d="m3.5 7.5 4.5-4.5 4.5 4.5M3.5 13l4.5-4.5 4.5 4.5" />
        </svg>
      );
    case "high":
      return (
        <svg {...common} opacity={op} stroke={color}>
          <path d="m3.5 10.5 4.5-4.5 4.5 4.5" />
        </svg>
      );
    case "medium":
      return (
        <svg {...common} opacity={op} stroke={color}>
          <path d="M3.5 6h9M3.5 10h9" />
        </svg>
      );
    case "low":
      return (
        <svg {...common} opacity={op} stroke={color}>
          <path d="m3.5 5.5 4.5 4.5 4.5-4.5" />
        </svg>
      );
    case "lowest":
      return (
        <svg {...common} opacity={op} stroke={color}>
          <path d="m3.5 3 4.5 4.5L12.5 3M3.5 8.5 8 13l4.5-4.5" />
        </svg>
      );
  }
}
