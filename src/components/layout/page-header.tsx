export function PageHeader({ title, children, subtitle }: { title: React.ReactNode; children?: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex min-h-[52px] flex-wrap items-center gap-2 border-b border-border bg-surface/90 px-5 py-2 backdrop-blur">
      <div className="min-w-[5.5rem] flex-1">
        <h1 className="truncate text-[17px] font-semibold tracking-[-0.01em]">{title}</h1>
        {subtitle && <p className="truncate text-meta text-fg-secondary">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

const TONES = {
  neutral: { ring: "bg-subtle", dot: "bg-border-strong", icon: "text-fg-secondary" },
  success: { ring: "bg-[#e4f6ec]", dot: "bg-[#9fd9bd]", icon: "text-success-strong" },
  info: { ring: "bg-[#eaf1ff]", dot: "bg-[#9db8f5]", icon: "text-accent" },
  danger: { ring: "bg-[#fdecec]", dot: "bg-[#eaa3a6]", icon: "text-danger-text" },
} as const;

/** Empty, no-result and error states (Figma 10.x): a soft illustrated tile, a title, one line of help and the next actions. */
export function EmptyState({ title, body, tone = "neutral", icon: Icon, children }: { title: string; body?: string; tone?: keyof typeof TONES; icon?: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>; children?: React.ReactNode }) {
  const c = TONES[tone];
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
      {Icon && (
        <span aria-hidden className={`relative mb-3 grid h-[68px] w-[68px] place-items-center rounded-full ${c.ring}`}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface shadow-[0_2px_8px_rgba(17,19,24,0.10)]">
            <span className={c.icon}>
              <Icon size={20} aria-hidden />
            </span>
          </span>
          <span className={`absolute end-0 top-1 h-2 w-2 rounded-full ${c.dot}`} />
          <span className={`absolute bottom-1.5 start-0 h-1.5 w-1.5 rounded-full ${c.dot}`} />
        </span>
      )}
      <p className="text-[16px] font-semibold">{title}</p>
      {body && <p className="max-w-sm text-ui text-fg-secondary">{body}</p>}
      {children && <div className="mt-3 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
