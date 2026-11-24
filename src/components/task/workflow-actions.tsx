"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/input";
import { PriorityIcon } from "@/components/icons/priority-icon";
import { Mono } from "@/components/ui/badges";
import { useApp } from "@/components/layout/app-context";
import { AttachmentField } from "@/components/forms/attachment-field";
import { cn } from "@/lib/cn";
import { canPerform } from "@/domain/policy";
import { canTransitionFrom, type WorkflowAction } from "@/domain/workflow";
import { PRIORITIES, type Priority, type TaskStatus } from "@/domain/types";
import type { UploadedRef } from "@/lib/upload";
import { duplicatesAction, proposeCancelAction, transitionAction, undoTransitionAction } from "@/server/actions/tasks";

export interface WorkflowTask {
  id: string;
  key: string;
  title: string;
  status: TaskStatus;
  requesterId: string;
  assigneeId: string | null;
  priority: Priority | null;
  suggestedPriority: Priority | null;
  projectId?: string;
}

type DialogKind = "accept" | "ask_info" | "answer" | "decline" | "merge" | "reopen" | "ship" | "cancel" | "propose_cancel";

interface Ctx {
  run: (task: WorkflowTask, action: WorkflowAction | "propose_cancel") => void;
}

const WorkflowContext = createContext<Ctx | null>(null);

export function useWorkflow() {
  const c = useContext(WorkflowContext);
  if (!c) throw new Error("useWorkflow outside WorkflowProvider");
  return c;
}

/** Actions this viewer may take on this task now (same policy as the server). */
export function availableActions(me: { id: string; role: Parameters<typeof canPerform>[0]["role"] }, task: WorkflowTask): WorkflowAction[] {
  const all: WorkflowAction[] = ["accept", "ask_info", "decline", "merge", "answer", "start", "ship", "verify", "reopen", "cancel"];
  return all.filter((a) => canPerform(me, a, { status: task.status, requesterId: task.requesterId, assigneeId: task.assigneeId }) && canTransitionFrom(a, task.status));
}

/** Provides workflow dialogs to any list or page. Direct actions (start, verify) run at once with a 10 s Undo. */
export function WorkflowProvider({ children, releases = [] }: { children: React.ReactNode; releases?: Array<{ id: string; number: string }> }) {
  const t = useTranslations("actions");
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const [state, setState] = useState<{ kind: DialogKind; task: WorkflowTask } | null>(null);

  const direct = useCallback(
    async (task: WorkflowTask, action: WorkflowAction) => {
      const r = await transitionAction({ taskId: task.id, action });
      if (!r.ok) {
        toast.error(r.error === "forbidden" ? tc("forbidden") : r.error === "invalid_status" ? tc("invalidStatus") : tc("error"));
        return;
      }
      toast.success(t("done", { key: task.key, status: ts(r.data!.to) }), {
        duration: 10_000,
        action: {
          label: tc("undo"),
          onClick: async () => {
            const u = await undoTransitionAction(task.id);
            if (!u.ok) toast.error(u.message ?? tc("error"));
          },
        },
      });
    },
    [t, ts, tc],
  );

  const run = useCallback(
    (task: WorkflowTask, action: WorkflowAction | "propose_cancel") => {
      if (action === "start" || action === "verify") void direct(task, action);
      else setState({ kind: action, task });
    },
    [direct],
  );

  return (
    <WorkflowContext value={{ run }}>
      {children}
      <Dialog open={!!state} onOpenChange={(o) => !o && setState(null)}>
        {state && (
          <DialogContent title={`${dialogTitle(state.kind, t)} · ${state.task.key}`} description={state.task.title}>
            <ActionForm kind={state.kind} task={state.task} releases={releases} onDone={() => setState(null)} />
          </DialogContent>
        )}
      </Dialog>
    </WorkflowContext>
  );
}

function dialogTitle(kind: DialogKind, t: ReturnType<typeof useTranslations>) {
  const map: Record<DialogKind, string> = {
    accept: t("accept"),
    ask_info: t("askInfo"),
    answer: t("answer"),
    decline: t("decline"),
    merge: t("merge"),
    reopen: t("reopen"),
    ship: t("ship"),
    cancel: t("cancel"),
    propose_cancel: t("proposeCancel"),
  };
  return map[kind];
}

function ActionForm({ kind, task, releases, onDone }: { kind: DialogKind; task: WorkflowTask; releases: Array<{ id: string; number: string }>; onDone: () => void }) {
  const t = useTranslations("actions");
  const tp = useTranslations("priority");
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const { me, members } = useApp();
  const [comment, setComment] = useState("");
  const [priority, setPriority] = useState<Priority>(task.priority ?? task.suggestedPriority ?? "medium");
  const [assigneeId, setAssigneeId] = useState(me.role === "abg_member" ? me.id : (task.assigneeId ?? me.id));
  const [dueDate, setDueDate] = useState("");
  const [releaseId, setReleaseId] = useState("");
  const [targetKey, setTargetKey] = useState("");
  const [targets, setTargets] = useState<Array<{ id: string; key: string; title: string }>>([]);
  const [targetId, setTargetId] = useState("");
  const [attachments, setAttachments] = useState<UploadedRef[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsText = ["ask_info", "answer", "decline", "reopen", "cancel", "propose_cancel"].includes(kind);
  const abg = members.filter((m) => m.side === "abg");

  const submit = async () => {
    if (needsText && !comment.trim()) {
      setError(tc("required"));
      return;
    }
    if (kind === "merge" && !targetId) {
      setError(tc("required"));
      return;
    }
    setBusy(true);
    const r =
      kind === "propose_cancel"
        ? await proposeCancelAction(task.id, comment)
        : await transitionAction({
            taskId: task.id,
            action: kind,
            comment: ["ask_info", "answer", "reopen"].includes(kind) ? comment : undefined,
            reason: ["decline", "cancel"].includes(kind) ? comment : undefined,
            priority: kind === "accept" ? priority : undefined,
            assigneeId: kind === "accept" ? assigneeId : undefined,
            dueDate: kind === "accept" && dueDate ? dueDate : undefined,
            releaseId: kind === "ship" && releaseId ? releaseId : undefined,
            targetTaskId: kind === "merge" ? targetId : undefined,
            attachments: kind === "reopen" ? attachments.map(({ previewUrl: _p, ...a }) => a) : undefined,
          });
    setBusy(false);
    if (!r.ok) {
      setError(r.error === "forbidden" ? (r.message ?? tc("forbidden")) : r.error === "invalid_status" ? tc("invalidStatus") : tc("error"));
      return;
    }
    if (kind !== "propose_cancel" && r.data && "to" in (r.data as object)) {
      const to = (r.data as { to: TaskStatus }).to;
      toast.success(t("done", { key: task.key, status: ts(to) }), {
        duration: 10_000,
        action: { label: tc("undo"), onClick: () => void undoTransitionAction(task.id) },
      });
    } else toast.success(tc("saved"));
    onDone();
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {kind === "accept" && (
        <>
          <fieldset>
            <legend className="mb-1 text-meta font-medium text-fg-secondary">{t("priority")}</legend>
            <div className="grid grid-cols-4 gap-1.5">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={priority === p}
                  onClick={() => setPriority(p)}
                  className={cn("inline-flex h-8 items-center justify-center gap-1 rounded-control border text-ui", priority === p ? "border-primary bg-subtle font-medium" : "border-border hover:bg-subtle")}
                >
                  <PriorityIcon priority={p} />
                  {tp(p)}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="wf-assignee">{t("assignee")}</Label>
              <Select id="wf-assignee" value={assigneeId} disabled={me.role === "abg_member"} onChange={(e) => setAssigneeId(e.target.value)}>
                {abg.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="wf-due">{t("dueDate")}</Label>
              <Input id="wf-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <p className="mt-1 text-meta text-fg-muted">{t("dueHint")}</p>
            </div>
          </div>
        </>
      )}

      {kind === "merge" && (
        <div>
          <Label htmlFor="wf-target">{t("mergeTarget")}</Label>
          <Input
            id="wf-target"
            value={targetKey}
            placeholder="BOS-14 or title…"
            onChange={async (e) => {
              setTargetKey(e.target.value);
              setTargetId("");
              const v = e.target.value.trim();
              if (v.length >= 3) setTargets((await duplicatesAction(null, v, task.id)).map((x) => ({ id: x.id, key: x.key, title: x.title })));
            }}
          />
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto" role="listbox" aria-label={t("mergeTarget")}>
            {targets.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={targetId === x.id}
                  onClick={() => setTargetId(x.id)}
                  className={cn("flex w-full items-center gap-2 rounded-control border px-2 py-1.5 text-start text-ui", targetId === x.id ? "border-accent bg-info-subtle" : "border-border hover:bg-subtle")}
                >
                  <Mono className="text-fg-secondary">{x.key}</Mono>
                  <span className="truncate">{x.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {kind === "ship" && releases.length > 0 && (
        <div>
          <Label htmlFor="wf-release">{t("release")}</Label>
          <Select id="wf-release" value={releaseId} onChange={(e) => setReleaseId(e.target.value)}>
            <option value="">{t("noRelease")}</option>
            {releases.map((r) => (
              <option key={r.id} value={r.id}>
                {r.number}
              </option>
            ))}
          </Select>
        </div>
      )}

      {needsText && (
        <div>
          <Label htmlFor="wf-text">{kind === "ask_info" ? t("question") : kind === "answer" ? t("answerPlaceholder") : kind === "reopen" ? t("whatsBroken") : t("reason")}</Label>
          <Textarea id="wf-text" rows={4} autoFocus value={comment} aria-invalid={!!error && !comment.trim()} onChange={(e) => setComment(e.target.value)} />
        </div>
      )}

      {kind === "reopen" && <AttachmentField value={attachments} onChange={setAttachments} compact />}

      <FieldError>{error}</FieldError>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" variant={kind === "decline" || kind === "cancel" || kind === "reopen" ? "danger" : "primary"} disabled={busy}>
          {dialogTitle(kind, t)}
        </Button>
      </div>
    </form>
  );
}
