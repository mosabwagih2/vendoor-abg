// Allowed attachment types (FR-6.6): images, video (mp4, mov), audio incl. WhatsApp voice notes (.opus), PDF, xlsx, csv. 100 MB each.
export const MAX_FILE_BYTES = 100 * 1024 * 1024;

const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  m4v: "video/mp4",
  opus: "audio/ogg",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  aac: "audio/aac",
  wav: "audio/wav",
  weba: "audio/webm",
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  txt: "text/plain",
};

export function extOf(name: string): string {
  return (name.split(".").pop() ?? "").toLowerCase();
}

/** Browsers report odd or empty types for .opus and .mov, so the extension decides. */
export function normalizedMime(name: string, reported?: string): string | null {
  const byExt = EXT_MIME[extOf(name)];
  if (byExt) return byExt;
  if (reported && /^(image|audio|video)\//.test(reported)) return reported;
  return null;
}

export function kindOf(mime: string): "image" | "audio" | "video" | "pdf" | "file" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "file";
}
