"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** PRD 10 real time: other people's changes appear within 5 s. Polls a cheap change marker and refreshes the page data. */
export function useLiveRefresh(intervalMs = 4000) {
  const router = useRouter();
  const last = useRef<string | null>(null);
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/changes", { cache: "no-store" });
        if (!r.ok) return;
        const { marker } = (await r.json()) as { marker: string };
        if (last.current && marker !== last.current && !stop) router.refresh();
        last.current = marker;
      } catch {}
    };
    void tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [router, intervalMs]);
}
