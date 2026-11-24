import "dotenv/config";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { db } from "../src/server/db";
import { sendEmail } from "../src/server/email";
import { getObject, putObject } from "../src/server/storage";
import { getWorkspaceConfig } from "../src/server/calendar";
import { addWorkingMinutes } from "../src/domain/sla";
import { recordEvent } from "../src/server/activity";
import { notify } from "../src/server/notify";

/**
 * Background worker: sends emails, makes attachments playable everywhere (ffmpeg), and sends the
 * "Shipped, not verified for 3 working days" reminder. Run with `pnpm worker` (started by `pnpm dev`).
 */
const run = promisify(execFile);
const POLL_MS = 2000;

async function processMedia(attachmentId: string) {
  const a = await db.attachment.findUnique({ where: { id: attachmentId } });
  if (!a) return;
  const dir = await mkdtemp(path.join(tmpdir(), "media-"));
  try {
    const input = path.join(dir, "in" + path.extname(a.fileName));
    await writeFile(input, await getObject(a.storageKey));
    const probe = JSON.parse((await run("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", input])).stdout);
    const duration = Number(probe.format?.duration) || null;
    const video = probe.streams?.find((s: { codec_type: string; disposition?: { attached_pic?: number } }) => s.codec_type === "video" && !s.disposition?.attached_pic);
    const audio = probe.streams?.find((s: { codec_type: string }) => s.codec_type === "audio");
    const base = a.storageKey.replace(/\/[^/]+$/, "");
    const data: Record<string, unknown> = { durationSec: duration, processingState: "ready" };

    if (video) {
      // H.264/AAC MP4 with faststart plays in every browser; copy the stream when it already is H.264.
      const out = path.join(dir, "play.mp4");
      const vcodec = video.codec_name === "h264" ? ["-c:v", "copy"] : ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-vf", "scale='min(1280,iw)':-2"];
      await run("ffmpeg", ["-y", "-v", "error", "-i", input, ...vcodec, "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", out], { maxBuffer: 1 << 26 });
      const poster = path.join(dir, "poster.jpg");
      await run("ffmpeg", ["-y", "-v", "error", "-ss", String(Math.min(1, (duration ?? 2) / 2)), "-i", input, "-frames:v", "1", "-vf", "scale='min(640,iw)':-2", poster]);
      await putObject(`${base}/play.mp4`, await readFile(out), "video/mp4");
      await putObject(`${base}/poster.jpg`, await readFile(poster), "image/jpeg");
      Object.assign(data, { playbackKey: `${base}/play.mp4`, posterKey: `${base}/poster.jpg`, width: video.width ?? null, height: video.height ?? null });
    } else if (audio) {
      // AAC .m4a plays everywhere, including iPhones before iOS 18.4 that cannot play WhatsApp's Ogg Opus.
      const out = path.join(dir, "play.m4a");
      await run("ffmpeg", ["-y", "-v", "error", "-i", input, "-vn", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", out]);
      await putObject(`${base}/play.m4a`, await readFile(out), "audio/mp4");
      // Waveform: 64 peaks from 8 kHz mono PCM.
      const pcm = (await run("ffmpeg", ["-v", "error", "-i", input, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"], { encoding: "buffer", maxBuffer: 1 << 28 })).stdout as unknown as Buffer;
      const samples = pcm.length / 2;
      const buckets = 64;
      const per = Math.max(1, Math.floor(samples / buckets));
      const peaks: number[] = [];
      for (let b = 0; b < buckets; b++) {
        let max = 0;
        for (let i = b * per; i < Math.min(samples, (b + 1) * per); i++) max = Math.max(max, Math.abs(pcm.readInt16LE(i * 2)));
        peaks.push(Math.round((max / 32768) * 100) / 100);
      }
      Object.assign(data, { playbackKey: `${base}/play.m4a`, waveform: peaks });
    }
    await db.attachment.update({ where: { id: a.id }, data });
  } catch (e) {
    console.error("[worker] media failed", attachmentId, e);
    await db.attachment.update({ where: { id: attachmentId }, data: { processingState: "failed" } });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** PRD 4.2 rule 3: reminder after 3 working days in Shipped (never auto-closed). */
async function verifyReminders() {
  const cfg = await getWorkspaceConfig();
  const shipped = await db.task.findMany({ where: { status: "shipped", verifyReminderSentAt: null, shippedAt: { not: null }, archivedAt: null } });
  const now = new Date();
  for (const t of shipped) {
    const at = addWorkingMinutes(cfg.calendar, t.shippedAt!, cfg.verifyReminderWorkingDays * 480);
    if (!at || at > now) continue;
    await db.$transaction(async (tx) => {
      await tx.task.update({ where: { id: t.id }, data: { verifyReminderSentAt: now } });
      const ev = await recordEvent(tx, { actorId: null, subjectType: "task", subjectId: t.id, taskId: t.id, verb: "verify_reminder" });
      await notify(tx, { eventId: ev.id, kind: "task.verify_reminder", actorId: null, recipients: [t.requesterId], taskId: t.id, email: { subject: `[${t.key}] Still waiting for your test`, line: `${t.key} "${t.title}" has been live for ${cfg.verifyReminderWorkingDays} working days. Please test and confirm.`, actionLabel: "Test and confirm", path: `/tasks/${t.key}` } });
    });
  }
}

async function tick() {
  const jobs = await db.job.findMany({ where: { doneAt: null, runAt: { lte: new Date() }, attempts: { lt: 5 } }, orderBy: { runAt: "asc" }, take: 5 });
  for (const j of jobs) {
    try {
      const p = j.payload as Record<string, string>;
      if (j.kind === "send_email") await sendEmail({ to: p.to, subject: p.subject, line: p.line, actionLabel: p.actionLabel, actionUrl: p.actionUrl });
      else if (j.kind === "process_media") await processMedia(p.attachmentId);
      await db.job.update({ where: { id: j.id }, data: { doneAt: new Date(), attempts: { increment: 1 } } });
    } catch (e) {
      await db.job.update({ where: { id: j.id }, data: { attempts: { increment: 1 }, lastError: String(e), runAt: new Date(Date.now() + 60_000 * (j.attempts + 1)) } });
    }
  }
}

let lastReminderScan = 0;
async function loop() {
  console.log("[worker] started");
  for (;;) {
    try {
      await tick();
      if (Date.now() - lastReminderScan > 10 * 60_000) {
        lastReminderScan = Date.now();
        await verifyReminders();
      }
    } catch (e) {
      console.error("[worker]", e);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

void loop();
