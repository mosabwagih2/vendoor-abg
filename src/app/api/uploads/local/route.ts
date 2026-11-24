import { NextResponse } from "next/server";
import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { getCurrentMember } from "@/server/session";
import { MAX_FILE_BYTES } from "@/lib/files";

/** Local storage driver: streams the request body to ./storage/<key>. Only the key's owner may write. */
export async function PUT(req: Request) {
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!key.startsWith(`uploads/${me.id}/`) || key.includes("..")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!req.body) return NextResponse.json({ error: "empty" }, { status: 400 });
  const root = path.join(process.cwd(), "storage");
  const file = path.join(root, key);
  if (!file.startsWith(root)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await mkdir(path.dirname(file), { recursive: true });
  let total = 0;
  const limit = new Transform({
    transform(chunk, _enc, cb) {
      total += chunk.length;
      if (total > MAX_FILE_BYTES) cb(new Error("too_large"));
      else cb(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(req.body as import("node:stream/web").ReadableStream), limit, createWriteStream(file));
  } catch (e) {
    await unlink(file).catch(() => undefined);
    const tooLarge = e instanceof Error && e.message === "too_large";
    return NextResponse.json({ error: tooLarge ? "too_large" : "failed" }, { status: tooLarge ? 413 : 500 });
  }
  return NextResponse.json({ ok: true, size: total });
}
