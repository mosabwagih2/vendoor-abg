"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Lock, Paperclip, SmilePlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { RelativeTime } from "@/components/ui/badges";
import { Markdown } from "@/components/ui/markdown";
import { useApp } from "@/components/layout/app-context";
import { AttachmentField } from "@/components/forms/attachment-field";
import { CredentialGuardDialog } from "@/components/forms/credential-guard";
import { AttachmentsView } from "./attachments-view";
import { useActivityText } from "./activity-line";
import { useWorkflow, type WorkflowTask } from "./workflow-actions";
import { cn } from "@/lib/cn";
import { analyzeText, redactSecrets } from "@/domain/credential-guard";
import type { UploadedRef } from "@/lib/upload";
import type { TaskDetail } from "@/server/task-detail";
import { addCommentAction, addCredentialAction, editCommentAction, toggleReactionAction } from "@/server/actions/tasks";

const EMOJI = ["👍", "✅", "👀", "🙏", "❤️"];

export function TaskActivity({ task, wf }: { task: TaskDetail; wf: WorkflowTask }) {
  const t = useTranslations("task");
  const [tab, setTab] = useState<"all" | "comments" | "history">("all");
  const describe = useActivityText();
  const items = [
    ...task.comments.map((c) => ({ kind: "comment" as const, at: c.createdAt, c })),
    ...task.history.filter((h) => h.verb !== "commented").map((h) => ({ kind: "event" as const, at: h.at, h })),
  ]
    .filter((x) => (tab === "all" ? true : tab === "comments" ? x.kind === "comment" : x.kind === "event"))
    .sort((a, b) => a.at.localeCompare(b.at));

  return (
    <section aria-labelledby="act-title">
      <div className="mb-3 flex items-center gap-3 border-b border-border">
        <h2 id="act-title" className="pb-2 text-ui font-semibold">
          {t("activity")}
        </h2>
        <div role="tablist" aria-label={t("activity")} className="ms-auto flex">
          {(["all", "comments", "history"] as const).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn("-mb-px border-b-2 px-2.5 pb-2 text-ui", tab === k ? "border-fg font-medium text-fg" : "border-transparent text-fg-secondary hover:text-fg")}
            >
              {k === "all" ? t("tabAll") : k === "comments" ? t("tabComments") : t("tabHistory")}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel"><ol className="space-y-3">
        {items.map((x) =>
          x.kind === "comment" ? (
            <CommentItem key={x.c.id} c={x.c} />
          ) : (
            <li key={x.h.id} className="flex items-baseline gap-2 ps-1 text-meta text-fg-secondary">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-border" aria-hidden />
              <span className="min-w-0 flex-1">
                {describe(x.h)}
                {x.h.isInternal && <Lock size={10} className="ms-1 inline" aria-label={t("internalBadge")} />}
              </span>
              <RelativeTime at={x.h.at} className="text-meta" />
            </li>
          ),
        )}
      </ol></div>
      <Composer task={task} wf={wf} />
    </section>
  );
}

function CommentItem({ c }: { c: TaskDetail["comments"][number] }) {
  const t = useTranslations("task");
  const tc = useTranslations("common");
  const { me } = useApp();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(c.body);
  const [mountedAt] = useState(() => Date.now());
  const canEdit = c.author.id === me.id && mountedAt - new Date(c.createdAt).getTime() < 15 * 60_000;
  const grouped = EMOJI.map((e) => ({ e, who: c.reactions.filter((r) => r.emoji === e) })).filter((g) => g.who.length);
  const kindLabel: Record<string, string> = { ask_info: "Asked for info", answer: "Answered", reopen_note: "Still broken", status_request: "Any update?", close_note: "Closed", verify_note: "Works" };
  return (
    <li className={cn("rounded-card border border-border bg-surface", c.isInternal && "border-[#f0d58a] bg-internal")}>
      <div className="flex items-center gap-2 px-3 pt-2.5 text-meta">
        <Avatar name={c.author.name} size={20} />
        <span className="font-medium text-fg">{c.author.name}</span>
        {kindLabel[c.kind] && <span className="rounded-full bg-subtle px-1.5 text-fg-secondary">{kindLabel[c.kind]}</span>}
        {c.isInternal && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f6e3a8] px-1.5 font-medium text-[#6b4b00]">
            <Lock size={10} aria-hidden />
            {t("internalBadge")}
          </span>
        )}
        <RelativeTime at={c.createdAt} className="text-meta" />
        {c.editedAt && <span className="text-fg-secondary">· {t("edited")}</span>}
        {canEdit && !editing && (
          <button type="button" className="ms-auto text-fg-secondary hover:text-fg" onClick={() => setEditing(true)}>
            {tc("edit")}
          </button>
        )}
      </div>
      <div className="px-3 pb-2.5 pt-1">
        {editing ? (
          <div className="space-y-2">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} aria-label={tc("edit")} />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                {tc("cancel")}
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={async () => {
                  const r = await editCommentAction(c.id, body);
                  if (r.ok) setEditing(false);
                  else toast.error(r.message ?? tc("error"));
                }}
              >
                {tc("save")}
              </Button>
            </div>
          </div>
        ) : (
          c.body && <Markdown>{c.body}</Markdown>
        )}
        {c.attachments.length > 0 && (
          <div className="mt-2">
            <AttachmentsView items={c.attachments} />
          </div>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {grouped.map((g) => (
            <button
              key={g.e}
              type="button"
              title={g.who.map((w) => w.name).join(", ")}
              onClick={() => toggleReactionAction(c.id, g.e)}
              className={cn("inline-flex h-6 items-center gap-1 rounded-full border px-1.5 text-meta", g.who.some((w) => w.memberId === me.id) ? "border-accent bg-info-subtle" : "border-border")}
            >
              {g.e} <span className="tabular">{g.who.length}</span>
            </button>
          ))}
          <ReactionPicker onPick={(e) => toggleReactionAction(c.id, e)} />
        </div>
      </div>
    </li>
  );
}

function ReactionPicker({ onPick }: { onPick: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative">
      <button type="button" aria-label="Add reaction" aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex h-6 w-7 items-center justify-center rounded-full text-fg-secondary hover:bg-subtle hover:text-fg">
        <SmilePlus size={14} aria-hidden />
      </button>
      {open && (
        <span className="absolute start-0 top-7 z-10 flex gap-0.5 rounded-full border border-border bg-surface p-1 shadow-[var(--shadow-pop)]">
          {EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              aria-label={e}
              className="h-7 w-7 rounded-full hover:bg-subtle"
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
            >
              {e}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

function Composer({ task, wf }: { task: TaskDetail; wf: WorkflowTask }) {
  const t = useTranslations("task");
  const tc = useTranslations("common");
  const { me, members } = useApp();
  const { run } = useWorkflow();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [files, setFiles] = useState<UploadedRef[]>([]);
  const [showFiles, setShowFiles] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [guard, setGuard] = useState(false);
  const isAbg = me.side === "abg";
  const isRequesterSide = me.side === "vendoor";

  const mentions = () => {
    const handles = [...body.matchAll(/@([a-z0-9-]+)/gi)].map((m) => m[1].toLowerCase());
    return members.filter((m) => handles.includes(m.handle)).map((m) => m.id);
  };

  const send = async (override = false, kind: "comment" | "status_request" = "comment", text = body) => {
    if (!text.trim() && !files.length) return;
    if (!override && analyzeText(text).level !== "none") {
      setGuard(true);
      return;
    }
    setBusy(true);
    const r = await addCommentAction({ taskId: task.id, body: text, isInternal: internal, kind, attachments: files.map(({ previewUrl: _p, ...a }) => a), mentions: mentions(), guardOverride: override });
    setBusy(false);
    if (!r.ok) {
      toast.error(tc("error"));
      return;
    }
    setBody("");
    setFiles([]);
    setShowFiles(false);
  };

  const quick: Array<{ label: string; onClick: () => void; show: boolean }> = [
    { label: t("quick.anyUpdate"), show: isRequesterSide && task.waitingOn === "abg", onClick: () => void send(true, "status_request", t("quick.anyUpdate")) },
    { label: t("quick.needInfo"), show: isAbg, onClick: () => run(wf, "ask_info") },
    { label: t("quick.works"), show: task.status === "shipped" && isRequesterSide, onClick: () => run(wf, "verify") },
    { label: t("quick.broken"), show: task.status === "shipped" && isRequesterSide, onClick: () => run(wf, "reopen") },
  ];

  return (
    <div className={cn("mt-4 rounded-card border bg-surface p-2", internal ? "border-[#f0d58a] bg-internal" : "border-border")}>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {quick
          .filter((q) => q.show)
          .map((q) => (
            <button key={q.label} type="button" onClick={q.onClick} className="h-7 rounded-full border border-border bg-surface px-2.5 text-meta hover:bg-subtle">
              {q.label}
            </button>
          ))}
      </div>
      <label htmlFor="composer" className="sr-only">
        {t("comment")}
      </label>
      <Textarea
        id="composer"
        rows={3}
        value={body}
        placeholder={t("commentPlaceholder")}
        className="border-0 bg-transparent px-1 focus-visible:outline-none"
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
        }}
      />
      {showFiles && <AttachmentField value={files} onChange={setFiles} compact onBusyChange={setUploading} />}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="icon" variant="ghost" aria-label={t("attachments")} onClick={() => setShowFiles(!showFiles)}>
          <Paperclip size={15} aria-hidden />
        </Button>
        {isAbg && (
          <label className="inline-flex items-center gap-1.5 text-meta text-fg-secondary">
            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="h-4 w-4" />
            <Lock size={12} aria-hidden />
            {t("internal")}
          </label>
        )}
        <Button size="sm" variant="primary" className="ms-auto" disabled={busy || uploading || (!body.trim() && !files.length)} onClick={() => void send()}>
          {t("send")}
        </Button>
      </div>
      <CredentialGuardDialog
        open={guard}
        onOpenChange={setGuard}
        onPostAnyway={() => {
          setGuard(false);
          void send(true);
        }}
        onMove={async () => {
          const g = analyzeText(body);
          await addCredentialAction(task.id, { username: g.suggestion?.username ?? "", password: g.suggestion?.password ?? "" });
          const redacted = redactSecrets(body);
          setGuard(false);
          setBody(redacted);
          toast.success(tc("saved"));
          document.getElementById("cred-title")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      />
    </div>
  );
}
