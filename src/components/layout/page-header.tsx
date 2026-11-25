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

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <p className="text-body text-fg-secondary">{title}</p>
      {children}
    </div>
  );
}
