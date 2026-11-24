import { NextResponse } from "next/server";
import { getCurrentMember } from "@/server/session";
import { db } from "@/server/db";
import { signedReadUrl } from "@/server/storage";

/** Checks the viewer, then redirects to a 1-hour signed URL. ?v=playback|poster|original */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentMember();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const a = await db.attachment.findUnique({ where: { id }, include: { comment: true } });
  if (!a || a.archivedAt) return new NextResponse("Not found", { status: 404 });
  if (a.comment?.isInternal && me.side !== "abg") return new NextResponse("Not found", { status: 404 });
  const v = new URL(req.url).searchParams.get("v");
  let key = a.storageKey;
  let type = a.mime;
  if (v === "poster" && a.posterKey) {
    key = a.posterKey;
    type = "image/jpeg";
  } else if (v !== "original" && a.playbackKey && a.processingState === "ready") {
    key = a.playbackKey;
    type = a.mime.startsWith("video/") ? "video/mp4" : "audio/mp4";
  }
  const url = await signedReadUrl(key, { fileName: a.fileName, contentType: type });
  return NextResponse.redirect(new URL(url, req.url), 302);
}
