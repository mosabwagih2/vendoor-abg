"use client";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Repeat, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { TagInput } from "@/components/ui/tag-input";
import { Mono, RelativeTime } from "@/components/ui/badges";
import { StatusIcon } from "@/components/icons/status-icon";
import { AttachmentField } from "@/components/forms/attachment-field";
import { AttachmentsView } from "./attachments-view";
import { TaskRow } from "./task-row";
import { formatDateTime } from "@/lib/format";
import type { UploadedRef } from "@/lib/upload";
import type { TaskStatus } from "@/domain/types";
import type { TaskDetail } from "@/server/task-detail";
import { addOccurrenceAction, addRelationAction, createSubtasksAction, removeRelationAction } from "@/server/actions/tasks";

export function Section({ id, title, count, action, children, empty }: { id: string; title: string; count?: number; action?: React.ReactNode; children: React.ReactNode; empty?: boolean }) {
  return (
    <section aria-labelledby={id} className="rounded-card border border-border bg-surface">
      <div className="flex min-h-10 items-center gap-2 border-b border-border px-4 py-1.5">
        <h2 id={id} className="text-ui font-semibold">
          {title}
        </h2>
        {count !== undefined && <span className="tabular text-meta text-fg-secondary">{count}</span>}
        <div className="ms-auto">{action}</div>
      </div>
      {!empty && <div className="p-3">{children}</div>}
    </section>
  );
}

// ───────────── Sub-tasks (FR-6.4) ─────────────
export function Subtasks({ task, canEdit }: { task: TaskDetail; canEdit: boolean }) {
  const t = useTranslations("task");
  const tc = useTranslations("common");
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const done = task.subtasks.filter((s) => s.status === "done").length;
  const total = task.subtasks.length;
  if (!total && !canEdit) return null;
  return (
    <Section
      id="sub-title"
      title={t("subtasks")}
      count={total ? undefined : 0}
      empty={!total && !adding}
      action={
        canEdit && (
          <Button size="sm" variant="ghost" onClick={() => setAdding(true)}>
            <Plus size={14} aria-hidden />
            {t("addSubtask")}
          </Button>
        )
      }
    >
      {total > 0 && (
        <div className="mb-2 flex items-center gap-2 px-1">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={t("subtasks")}>
            <div className="h-full bg-st-done" style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <span className="tabular text-meta text-fg-secondary">
            {done} / {total}
          </span>
        </div>
      )}
      {total > 0 && (
        <div className="-mx-3 border-t border-border">
          {task.subtasks.map((s) => (
            <TaskRow key={s.id} task={s} props={["priority", "assignee", "waiting"]} />
          ))}
        </div>
      )}
      {adding && (
        <form
          className="mt-2 space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const titles = text.split("\n").map((s) => s.replace(/^\s*(\d+[.)]|[-*•])\s*/, "").trim()).filter(Boolean);
            if (!titles.length) return;
            const r = await createSubtasksAction(task.id, titles);
            if (r.ok) {
              setText("");
              setAdding(false);
            } else toast.error(tc("error"));
          }}
        >
          <Label htmlFor="sub-new">{t("subtaskTitle")}</Label>
          <Textarea id="sub-new" rows={3} value={text} autoFocus onChange={(e) => setText(e.target.value)} placeholder={t("subtasksBulk")} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              {tc("cancel")}
            </Button>
            <Button size="sm" type="submit" variant="primary">
              {tc("add")}
            </Button>
          </div>
        </form>
      )}
    </Section>
  );
}

// ───────────── Occurrences / "Happened again" (FR-6.5) ─────────────
export function Occurrences({ task }: { task: TaskDetail }) {
  const t = useTranslations("task");
  const to = useTranslations("occurrence");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [codes, setCodes] = useState<string[]>([]);
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<UploadedRef[]>([]);
  const [busy, setBusy] = useState(false);
  return (
    <Section
      id="occ-title"
      title={t("occurrences")}
      count={task.occurrences.length}
      action={
        <Button size="sm" onClick={() => setOpen(!open)}>
          <Repeat size={14} aria-hidden />
          {t("happenedAgain")}
        </Button>
      }
    >
      {open && (
        <form
          className="mb-3 grid gap-2 rounded-control border border-border bg-canvas p-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const r = await addOccurrenceAction({ taskId: task.id, accounts, orderCodes: codes, happenedAt: when ? new Date(when).toISOString() : null, note, attachments: files.map(({ previewUrl: _p, ...a }) => a) });
            setBusy(false);
            if (r.ok) {
              toast.success(to("added"));
              setOpen(false);
              setAccounts([]);
              setCodes([]);
              setNote("");
              setFiles([]);
              setWhen("");
            } else toast.error(tc("error"));
          }}
        >
          <div>
            <Label htmlFor="occ-acc">{to("account")}</Label>
            <TagInput id="occ-acc" value={accounts} onChange={setAccounts} />
          </div>
          <div>
            <Label htmlFor="occ-codes">{to("orderCodes")}</Label>
            <TagInput id="occ-codes" value={codes} onChange={setCodes} />
          </div>
          <div>
            <Label htmlFor="occ-when">{to("date")}</Label>
            <Input id="occ-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="occ-note">{to("note")}</Label>
            <Textarea id="occ-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <AttachmentField value={files} onChange={setFiles} compact />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button size="sm" type="submit" variant="primary" disabled={busy}>
              {to("submit")}
            </Button>
          </div>
        </form>
      )}
      {!task.occurrences.length && !open && <p className="px-1 text-meta text-fg-secondary">{t("noOccurrences")}</p>}
      <ol className="space-y-2">
        {task.occurrences.map((o) => (
          <li key={o.id} className="rounded-control border border-border p-2.5">
            <div className="flex flex-wrap items-center gap-1.5 text-meta text-fg-secondary">
              <span className="font-medium text-fg">{formatDateTime(o.happenedAt)}</span>
              <span>· {o.reportedBy}</span>
              {o.accounts.map((a) => (
                <Mono key={a} className="rounded bg-subtle px-1.5">
                  {a}
                </Mono>
              ))}
              {o.orderCodes.map((a) => (
                <Mono key={a} className="rounded bg-subtle px-1.5">
                  {a}
                </Mono>
              ))}
            </div>
            {o.note && <p className="mt-1 whitespace-pre-line text-ui">{o.note}</p>}
            {o.attachments.length > 0 && (
              <div className="mt-2">
                <AttachmentsView items={o.attachments} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </Section>
  );
}

// ───────────── Relations (FR-6.7) ─────────────
export function Relations({ task, canEdit }: { task: TaskDetail; canEdit: boolean }) {
  const t = useTranslations("task");
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<"related" | "blocks" | "duplicate_of">("related");
  const [key, setKey] = useState("");
  const label = (r: TaskDetail["relations"][number]) =>
    r.kind === "related" ? t("relationKind.related") : r.kind === "blocks" ? (r.direction === "from" ? t("relationKind.blocks") : t("relationKind.blocked_by")) : r.direction === "from" ? t("relationKind.duplicate_of") : t("relationKind.duplicates");
  if (!task.relations.length && !canEdit) return null;
  return (
    <Section
      id="rel-title"
      title={t("relations")}
      count={task.relations.length}
      empty={!task.relations.length && !adding}
      action={
        canEdit && (
          <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>
            <Plus size={14} aria-hidden />
            {t("addRelation")}
          </Button>
        )
      }
    >
      <ul className="flex flex-wrap gap-1.5">
        {task.relations.map((r) => (
          <li key={r.id} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border ps-2.5 pe-1 text-meta">
            <span className="text-fg-secondary">{label(r)}</span>
            <StatusIcon status={r.task.status as TaskStatus} label={ts(r.task.status as TaskStatus)} size={12} />
            <Link href={`/tasks/${r.task.key}`} className="max-w-[260px] truncate hover:underline">
              <Mono>{r.task.key}</Mono> {r.task.title}
            </Link>
            {canEdit && (
              <button type="button" aria-label={tc("remove")} className="inline-flex h-6 w-6 items-center justify-center rounded-full text-fg-secondary hover:bg-subtle" onClick={() => removeRelationAction(r.id)}>
                <X size={12} aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>
      {adding && (
        <form
          className="mt-2 flex flex-wrap gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await addRelationAction(task.id, key, kind);
            if (r.ok) {
              setKey("");
              setAdding(false);
            } else toast.error(tc("error"));
          }}
        >
          <Select aria-label={t("relations")} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="w-auto">
            <option value="related">{t("relationKind.related")}</option>
            <option value="blocks">{t("relationKind.blocks")}</option>
            <option value="duplicate_of">{t("relationKind.duplicate_of")}</option>
          </Select>
          <Input aria-label={t("taskKey")} placeholder={t("taskKey")} value={key} onChange={(e) => setKey(e.target.value)} className="w-40 font-mono" />
          <Button size="md" type="submit" variant="primary">
            {tc("add")}
          </Button>
        </form>
      )}
    </Section>
  );
}

export { RelativeTime };
