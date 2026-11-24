"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Mic, Paperclip, Square, X, FileText, Music, Film } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { fileSize } from "@/lib/format";
import { pickRecorderMime, uploadFile, UploadError, type UploadedRef } from "@/lib/upload";
import { Button } from "@/components/ui/button";

const MAX_RECORD_SECONDS = 5 * 60;

interface Pending {
  id: string;
  name: string;
  pct: number;
}

/** Drag-and-drop, paste, browse (incl. phone gallery) and in-browser voice notes (FR-6.6, FR-7.1). */
export function AttachmentField({
  value,
  onChange,
  invalid,
  describedBy,
  compact,
  onBusyChange,
}: {
  value: UploadedRef[];
  onChange: (v: UploadedRef[]) => void;
  invalid?: boolean;
  describedBy?: string;
  compact?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const t = useTranslations("attachments");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [drag, setDrag] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => onBusyChange?.(pending.length > 0), [pending.length, onBusyChange]);

  const addFiles = async (files: File[]) => {
    for (const f of files) {
      const id = crypto.randomUUID();
      setPending((p) => [...p, { id, name: f.name, pct: 0 }]);
      try {
        const ref = await uploadFile(f, (pct) => setPending((p) => p.map((x) => (x.id === id ? { ...x, pct } : x))));
        valueRef.current = [...valueRef.current, ref];
        onChange(valueRef.current);
      } catch (e) {
        const code = e instanceof UploadError ? e.code : "failed";
        toast.error(code === "too_large" ? t("tooLarge", { name: f.name }) : code === "bad_type" ? t("badType", { name: f.name }) : t("failed", { name: f.name }));
      } finally {
        setPending((p) => p.filter((x) => x.id !== id));
      }
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        void addFiles([...e.dataTransfer.files]);
      }}
      onPaste={(e) => {
        const files = [...e.clipboardData.files];
        if (files.length) {
          e.preventDefault();
          void addFiles(files);
        }
      }}
      className={cn("rounded-card border border-dashed border-border bg-canvas p-3", drag && "border-accent bg-info-subtle", invalid && "border-danger")}
      aria-describedby={describedBy}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => inputRef.current?.click()}>
          <Paperclip size={14} aria-hidden />
          {t("browse")}
        </Button>
        <VoiceRecorder onRecorded={(f) => addFiles([f])} />
        {!compact && <span className="text-meta text-fg-muted">{t("drop")}…</span>}
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept="image/*,video/mp4,video/quicktime,.mov,audio/*,.opus,.ogg,.m4a,.mp3,application/pdf,.xlsx,.xls,.csv"
          onChange={(e) => {
            void addFiles([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </div>
      {!compact && <p className="mt-1.5 text-meta text-fg-muted">{t("maxSize")}</p>}
      {(value.length > 0 || pending.length > 0) && (
        <ul className="mt-2 space-y-1">
          {value.map((a) => (
            <li key={a.key} className="flex items-center gap-2 rounded-control border border-border bg-surface px-2 py-1">
              {a.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.previewUrl} alt="" className="h-8 w-8 rounded object-cover" />
              ) : a.mime.startsWith("audio/") ? (
                <Music size={16} aria-hidden className="text-fg-muted" />
              ) : a.mime.startsWith("video/") ? (
                <Film size={16} aria-hidden className="text-fg-muted" />
              ) : (
                <FileText size={16} aria-hidden className="text-fg-muted" />
              )}
              <span className="min-w-0 flex-1 truncate text-ui">{a.fileName}</span>
              <span className="tabular text-meta text-fg-muted">{fileSize(a.size)}</span>
              <button type="button" aria-label={t("remove", { name: a.fileName })} className="rounded p-1 text-fg-muted hover:bg-subtle hover:text-fg" onClick={() => onChange(value.filter((x) => x.key !== a.key))}>
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
          {pending.map((p) => (
            <li key={p.id} className="rounded-control border border-border bg-surface px-2 py-1 text-ui text-fg-secondary" role="status">
              {t("uploading", { name: p.name, pct: p.pct })}
              <div className="mt-1 h-1 rounded bg-subtle">
                <div className="h-1 rounded bg-accent transition-[width]" style={{ width: `${p.pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VoiceRecorder({ onRecorded }: { onRecorded: (f: File) => void }) {
  const t = useTranslations("attachments");
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [secs, setSecs] = useState(0);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelled = useRef(false);

  const stop = (cancel = false) => {
    cancelled.current = cancel;
    rec?.stop();
    rec?.stream.getTracks().forEach((tr) => tr.stop());
    if (timer.current) clearInterval(timer.current);
    setRec(null);
  };

  useEffect(() => {
    if (secs >= MAX_RECORD_SECONDS) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secs]);

  if (rec) {
    const mm = Math.floor(secs / 60);
    const ss = String(secs % 60).padStart(2, "0");
    return (
      <span className="inline-flex items-center gap-1.5" role="status">
        <span className="inline-flex h-7 items-center gap-1.5 rounded-control bg-danger-subtle px-2 text-ui font-medium text-danger">
          <span className="h-2 w-2 animate-pulse rounded-full bg-danger" aria-hidden />
          {t("recording", { time: `${mm}:${ss}` })}
          {secs >= 270 && <span className="text-meta">· {t("limitNear")}</span>}
        </span>
        <Button size="sm" variant="primary" onClick={() => stop(false)}>
          <Square size={12} aria-hidden />
          {t("stop")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => stop(true)}>
          {t("discard")}
        </Button>
      </span>
    );
  }
  return (
    <Button
      size="sm"
      onClick={async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mime = pickRecorderMime();
          const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
          chunks.current = [];
          cancelled.current = false;
          r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
          r.onstop = () => {
            if (cancelled.current) return;
            const type = r.mimeType || "audio/webm";
            const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
            onRecorded(new File(chunks.current, `voice-note-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${ext}`, { type: type.split(";")[0] }));
          };
          r.start(1000);
          setSecs(0);
          timer.current = setInterval(() => setSecs((s) => s + 1), 1000);
          setRec(r);
        } catch {
          toast.error(t("micDenied"));
        }
      }}
    >
      <Mic size={14} aria-hidden />
      {t("record")}
    </Button>
  );
}
