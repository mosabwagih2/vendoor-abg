"use client";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

export function CopyButton({ value, label, onCopied, className, children }: { value: string | (() => Promise<string>); label: string; onCopied?: () => void; className?: string; children?: React.ReactNode }) {
  const t = useTranslations("common");
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn("inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-control px-1.5 text-meta text-fg-secondary hover:bg-subtle hover:text-fg", className)}
      onClick={async () => {
        const v = typeof value === "function" ? await value() : value;
        await navigator.clipboard.writeText(v);
        setDone(true);
        onCopied?.();
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check size={14} className="text-st-done" aria-hidden /> : <Copy size={14} aria-hidden />}
      {children}
      <span aria-live="polite" className={done ? "" : "sr-only"}>
        {done ? t("copied") : ""}
      </span>
    </button>
  );
}
