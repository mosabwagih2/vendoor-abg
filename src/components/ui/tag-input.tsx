"use client";
import { X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

/** Free tags (accounts, order codes). Enter, comma or paste adds; Backspace on empty removes the last. */
export function TagInput({
  value,
  onChange,
  placeholder,
  id,
  invalid,
  describedBy,
  mono = true,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
  mono?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const parts = raw.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])]);
    setDraft("");
  };
  return (
    <div
      className={cn(
        "flex min-h-8 w-full flex-wrap items-center gap-1 rounded-control border border-border bg-surface px-1.5 py-1 focus-within:outline-2 focus-within:outline-accent",
        invalid && "border-danger",
      )}
    >
      {value.map((v) => (
        <span key={v} className={cn("inline-flex h-6 items-center gap-1 rounded-control bg-subtle ps-2 pe-0.5 text-meta", mono && "font-mono")}>
          {v}
          <button type="button" aria-label={`Remove ${v}`} className="inline-flex h-6 w-6 items-center justify-center rounded text-fg-muted hover:text-fg" onClick={() => onChange(value.filter((x) => x !== v))}>
            <X size={12} aria-hidden />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => (e.target.value.includes(",") ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => draft && add(draft)}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (/[,\n]/.test(text)) {
            e.preventDefault();
            add(text);
          }
        }}
        placeholder={value.length ? "" : placeholder}
        className="h-6 min-w-[120px] flex-1 bg-transparent px-1 text-ui outline-none placeholder:text-fg-muted"
      />
    </div>
  );
}
