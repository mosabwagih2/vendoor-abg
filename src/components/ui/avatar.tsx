import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const COLORS = ["#4F5BD5", "#0A84FF", "#30A46C", "#E5A000", "#8E4EC6", "#F76B15", "#E5484D", "#12A594"];

function colorFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function Avatar({ name, size = 20, className, title }: { name?: string | null; size?: number; className?: string; title?: string }) {
  if (!name)
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-fg-muted", className)}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  return (
    <span
      title={title ?? name}
      aria-hidden
      className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium text-white", className)}
      style={{ width: size, height: size, background: colorFor(name), fontSize: Math.max(9, Math.round(size * 0.42)) }}
    >
      {initials(name)}
    </span>
  );
}
