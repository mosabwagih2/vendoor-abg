import { NextResponse } from "next/server";
import { z } from "zod";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getCurrentMember } from "@/server/session";
import { MAX_FILE_BYTES, normalizedMime } from "@/lib/files";

const schema = z.object({ fileName: z.string().min(1).max(255), size: z.number().int().positive(), mime: z.string().max(200).optional() });

/** Step 1 of an upload: validate type and size, mint a key that belongs to the uploader, return where to PUT the bytes. */
export async function POST(req: Request) {
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const { fileName, size } = parsed.data;
  if (size > MAX_FILE_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });
  const mime = normalizedMime(fileName, parsed.data.mime);
  if (!mime) return NextResponse.json({ error: "bad_type" }, { status: 415 });
  const safe = fileName.replace(/[^\w.\-]+/g, "_").slice(-120);
  const key = `uploads/${me.id}/${crypto.randomUUID()}/${safe}`;
  if (process.env.STORAGE_DRIVER === "s3") {
    const s3 = new S3Client({
      region: process.env.S3_REGION ?? "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: !!process.env.S3_ENDPOINT,
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "" },
    });
    const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, ContentType: mime }), { expiresIn: 3600 });
    return NextResponse.json({ key, mime, uploadUrl: url, headers: { "Content-Type": mime } });
  }
  return NextResponse.json({ key, mime, uploadUrl: `/api/uploads/local?key=${encodeURIComponent(key)}`, headers: { "Content-Type": mime } });
}
