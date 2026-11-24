"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, FileText, Pause, Play, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { fileSize } from "@/lib/format";
import { kindOf } from "@/lib/files";
import type { AttachmentView } from "@/server/task-detail";

const src = (id: string, v?: "original" | "poster") => `/api/attachments/${id}${v ? `?v=${v}` : ""}`;

/** Inline previews: images open in a lightbox, audio/video play in the browser (FR-6.6). */
export function AttachmentsView({ items }: { items: AttachmentView[] }) {
  if (!items.length) return null;
  const media = items.filter((a) => ["image", "video"].includes(kindOf(a.mime)));
  const audio = items.filter((a) => kindOf(a.mime) === "audio");
  const files = items.filter((a) => ["pdf", "file"].includes(kindOf(a.mime)));
  return (
    <div className="space-y-2">
      {audio.map((a) => (
        <AudioPlayer key={a.id} a={a} />
      ))}
      {media.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {media.map((a) => (kindOf(a.mime) === "image" ? <ImageThumb key={a.id} a={a} /> : <VideoPlayer key={a.id} a={a} />))}
        </div>
      )}
      {files.map((a) => (
        <a key={a.id} href={src(a.id, "original")} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-ui hover:bg-subtle">
          <FileText size={16} aria-hidden className="text-fg-muted" />
          <span className="min-w-0 flex-1 truncate">{a.fileName}</span>
          <span className="tabular text-meta text-fg-muted">{fileSize(a.size)}</span>
          <Download size={14} aria-hidden className="text-fg-muted" />
        </a>
      ))}
    </div>
  );
}

function ImageThumb({ a }: { a: AttachmentView }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="group relative aspect-[4/3] overflow-hidden rounded-card border border-border bg-subtle" aria-label={a.fileName}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src(a.id)} alt={a.fileName} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={a.fileName} wide>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src(a.id)} alt={a.fileName} className="mx-auto max-h-[70vh] rounded-card" />
          <a href={src(a.id, "original")} download className="mt-3 inline-flex items-center gap-1 text-ui text-accent hover:underline">
            <Download size={14} aria-hidden /> {a.fileName}
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}

function VideoPlayer({ a }: { a: AttachmentView }) {
  const t = useTranslations("common");
  return (
    <figure className="overflow-hidden rounded-card border border-border bg-black">
      <video controls preload="metadata" playsInline poster={a.hasPoster ? src(a.id, "poster") : undefined} className="aspect-video w-full">
        <source src={src(a.id)} />
      </video>
      <figcaption className="flex items-center gap-2 bg-surface px-2 py-1 text-meta text-fg-secondary">
        <span className="min-w-0 flex-1 truncate">{a.fileName}</span>
        {a.processingState === "pending" && <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" aria-hidden />{t("processing")}</span>}
        <a href={src(a.id, "original")} download aria-label={`${t("download")} ${a.fileName}`} className="rounded p-1 hover:bg-subtle">
          <Download size={12} aria-hidden />
        </a>
      </figcaption>
    </figure>
  );
}

/** Voice-note player (WhatsApp style): play/pause, waveform with progress, time, speed 1×/1.5×/2×. */
export function AudioPlayer({ a }: { a: AttachmentView }) {
  const t = useTranslations("attachments");
  const tc = useTranslations("common");
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(a.durationSec ?? 0);
  const [rate, setRate] = useState(1);
  const peaks = a.waveform ?? Array.from({ length: 48 }, (_, i) => 0.25 + 0.5 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)));
  useEffect(() => {
    if (ref.current) ref.current.playbackRate = rate;
  }, [rate]);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const pct = dur ? time / dur : 0;
  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-surface px-3 py-2">
      <button
        type="button"
        aria-label={playing ? t("pause") : t("play")}
        onClick={() => (ref.current?.paused ? ref.current.play() : ref.current?.pause())}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg"
      >
        {playing ? <Pause size={16} aria-hidden /> : <Play size={16} className="ms-0.5" aria-hidden />}
      </button>
      <div className="min-w-0 flex-1">
        <div
          className="flex h-8 cursor-pointer items-center gap-[2px]"
          role="slider"
          tabIndex={0}
          aria-label={a.fileName}
          aria-valuemin={0}
          aria-valuemax={Math.round(dur)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${fmt(time)} / ${fmt(dur)}`}
          onKeyDown={(e) => {
            if (!ref.current) return;
            if (e.key === "ArrowRight") ref.current.currentTime = Math.min(dur, time + 5);
            if (e.key === "ArrowLeft") ref.current.currentTime = Math.max(0, time - 5);
          }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const x = document.dir === "rtl" ? r.right - e.clientX : e.clientX - r.left;
            if (ref.current && dur) ref.current.currentTime = (x / r.width) * dur;
          }}
        >
          {peaks.map((p, i) => (
            <span key={i} className="w-full max-w-[3px] flex-1 rounded-full" style={{ height: `${Math.max(12, p * 100)}%`, background: i / peaks.length <= pct ? "var(--accent)" : "var(--border-default)" }} />
          ))}
        </div>
        <div className="flex items-center gap-2 text-meta text-fg-secondary">
          <span className="tabular">{fmt(playing || time ? time : dur)}</span>
          <span className="min-w-0 flex-1 truncate">{a.fileName}</span>
          {a.processingState === "pending" && <span>{tc("processing")}</span>}
        </div>
      </div>
      <button type="button" aria-label={`${t("playbackSpeed")}: ${rate}×`} onClick={() => setRate(rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1)} className="tabular h-7 shrink-0 rounded-full bg-subtle px-2 text-meta font-semibold">
        {rate}×
      </button>
      <a href={src(a.id, "original")} download aria-label={`${tc("download")} ${a.fileName}`} className="shrink-0 rounded p-1 text-fg-muted hover:bg-subtle">
        <Download size={14} aria-hidden />
      </a>
      <audio
        ref={ref}
        src={src(a.id)}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDur(e.currentTarget.duration)}
      />
    </div>
  );
}
