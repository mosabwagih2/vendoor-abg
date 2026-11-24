"use client";
import { MAX_FILE_BYTES, normalizedMime } from "./files";

export interface UploadedRef {
  key: string;
  fileName: string;
  mime: string;
  size: number;
  durationSec?: number | null;
  previewUrl?: string;
}

export class UploadError extends Error {
  constructor(public code: "too_large" | "bad_type" | "failed") {
    super(code);
  }
}

/** Two-step upload: ask the server for a key, then PUT the bytes directly to storage (S3 or local) with progress. */
export async function uploadFile(file: File, onProgress?: (pct: number) => void): Promise<UploadedRef> {
  if (file.size > MAX_FILE_BYTES) throw new UploadError("too_large");
  if (!normalizedMime(file.name, file.type)) throw new UploadError("bad_type");
  const init = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, size: file.size, mime: file.type }),
  });
  if (!init.ok) {
    const { error } = await init.json().catch(() => ({ error: "failed" }));
    throw new UploadError(error === "too_large" || error === "bad_type" ? error : "failed");
  }
  const { key, mime, uploadUrl, headers } = (await init.json()) as { key: string; mime: string; uploadUrl: string; headers: Record<string, string> };
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new UploadError("failed")));
    xhr.onerror = () => reject(new UploadError("failed"));
    xhr.send(file);
  });
  let durationSec: number | null = null;
  if (mime.startsWith("audio/") || mime.startsWith("video/")) durationSec = await probeDuration(file).catch(() => null);
  return { key, fileName: file.name, mime, size: file.size, durationSec, previewUrl: mime.startsWith("image/") ? URL.createObjectURL(file) : undefined };
}

function probeDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const el = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
    el.preload = "metadata";
    el.onloadedmetadata = () => resolve(Number.isFinite(el.duration) ? el.duration : null);
    el.onerror = () => resolve(null);
    el.src = URL.createObjectURL(file);
    setTimeout(() => resolve(null), 3000);
  });
}

/** Best recording format per browser; everything is normalised to AAC by the worker afterwards. */
export function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm"].find((m) => MediaRecorder.isTypeSupported(m));
}
