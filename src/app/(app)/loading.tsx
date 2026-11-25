/** Skeleton shown while a page's data loads. Keeps the frame steady so nothing jumps. */
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="space-y-3 p-5">
      <span className="sr-only">Loading…</span>
      <div className="h-6 w-48 animate-pulse rounded bg-subtle" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-card bg-subtle" />
      ))}
    </div>
  );
}
