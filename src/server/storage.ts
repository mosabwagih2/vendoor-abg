import "server-only";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { hmac, safeEqual } from "./crypto";

/**
 * Private file storage. "local" keeps files under ./storage and serves them through /api/files with an HMAC-signed,
 * 1-hour URL. "s3" uses any S3-compatible bucket with presigned URLs (1 h).
 */
const LOCAL_ROOT = path.join(process.cwd(), "storage");
const URL_TTL_SECONDS = 60 * 60;

function driver(): "local" | "s3" {
  return process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
}

let s3: S3Client | null = null;
function s3c(): S3Client {
  s3 ??= new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "" },
  });
  return s3;
}

function localPath(key: string): string {
  const p = path.join(LOCAL_ROOT, key);
  if (!p.startsWith(LOCAL_ROOT)) throw new Error("bad key");
  return p;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  if (driver() === "s3") {
    await s3c().send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
    return;
  }
  const p = localPath(key);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, body);
}

export async function getObject(key: string): Promise<Buffer> {
  if (driver() === "s3") {
    const r = await s3c().send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    return Buffer.from(await r.Body!.transformToByteArray());
  }
  return readFile(localPath(key));
}

export async function localFileInfo(key: string): Promise<{ path: string; size: number }> {
  const p = localPath(key);
  const s = await stat(p);
  return { path: p, size: s.size };
}

/** A URL that grants read access for 1 hour. */
export async function signedReadUrl(key: string, opts: { fileName?: string; contentType?: string } = {}): Promise<string> {
  if (driver() === "s3") {
    return getSignedUrl(
      s3c(),
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        ResponseContentType: opts.contentType,
        ResponseContentDisposition: opts.fileName ? `inline; filename="${encodeURIComponent(opts.fileName)}"` : undefined,
      }),
      { expiresIn: URL_TTL_SECONDS },
    );
  }
  const exp = Math.floor(Date.now() / 1000) + URL_TTL_SECONDS;
  const sig = hmac(`${key}:${exp}`);
  const q = new URLSearchParams({ exp: String(exp), sig });
  if (opts.contentType) q.set("type", opts.contentType);
  return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}?${q}`;
}

export function verifyLocalSignature(key: string, exp: string, sig: string): boolean {
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(hmac(`${key}:${exp}`), sig);
}
