import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { localFileInfo, verifyLocalSignature } from "@/server/storage";
import { opensInline, servedType } from "@/domain/file-link";

/** Serves local-driver files behind an HMAC-signed URL that expires in 1 hour. Supports Range (video/audio seeking). */
export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await params;
  const key = parts.map(decodeURIComponent).join("/");
  const url = new URL(req.url);
  const typeParam = url.searchParams.get("type") ?? "";
  if (!verifyLocalSignature(key, url.searchParams.get("exp") ?? "", url.searchParams.get("sig") ?? "", typeParam)) return new Response("Link expired", { status: 403 });
  let info;
  try {
    info = await localFileInfo(key);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const type = servedType(typeParam);
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    // Only media and PDFs open in the browser. Everything else downloads, and nothing can run scripts on our origin.
    "Content-Disposition": `${opensInline(type) ? "inline" : "attachment"}; filename="${encodeURIComponent(key.split("/").pop() ?? "file")}"`,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  };
  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m?.[1] ? Number(m[1]) : 0;
    const end = m?.[2] ? Math.min(Number(m[2]), info.size - 1) : info.size - 1;
    if (start >= info.size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
    const stream = Readable.toWeb(createReadStream(info.path, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${info.size}`, "Content-Length": String(end - start + 1) } });
  }
  const stream = Readable.toWeb(createReadStream(info.path)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, "Content-Length": String(info.size) } });
}
