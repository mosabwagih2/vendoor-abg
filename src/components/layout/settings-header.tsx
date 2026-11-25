/** Title, one-line hint and optional actions at the top of every settings page. */
export function SettingsHeader({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">{title}</h1>
        {hint && <p className="mt-0.5 text-ui text-fg-secondary">{hint}</p>}
      </div>
      {children}
    </header>
  );
}

/** A titled group of settings rows (Figma "Workspace", "Requests" cards). */
export function SettingsCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 overflow-hidden rounded-card border border-border bg-surface">
      {title && <h2 className="border-b border-border bg-canvas px-4 py-2.5 text-ui font-semibold">{title}</h2>}
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

export function SettingsRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1 basis-56">
        <div className="text-ui font-medium">{label}</div>
        {hint && <div className="text-meta text-fg-muted">{hint}</div>}
      </div>
      <div className="w-full sm:w-[260px]">{children}</div>
    </div>
  );
}
