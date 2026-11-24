"use client";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bell, BellOff, ChevronRight, MoreHorizontal, Pin, Pencil, Ban, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { TagInput } from "@/components/ui/tag-input";
import { Markdown } from "@/components/ui/markdown";
import { Avatar } from "@/components/ui/avatar";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { Mono, PriorityBadge, StatusBadge, WaitingBadge, DueDate, RelativeTime } from "@/components/ui/badges";
import { StatusIcon } from "@/components/icons/status-icon";
import { useApp } from "@/components/layout/app-context";
import { cn } from "@/lib/cn";
import { formatExact, dateKey } from "@/lib/format";
import { can, canAssign } from "@/domain/policy";
import { PRIORITIES, TASK_TYPES, type Priority, type TaskStatus } from "@/domain/types";
import type { TaskDetail } from "@/server/task-detail";
import { setFollowAction, updateFieldAction } from "@/server/actions/tasks";
import { ActionButtons } from "./action-buttons";
import { AttachmentsView } from "./attachments-view";
import { CredentialsCard } from "./credentials-card";
import { TaskActivity } from "./task-activity";
import { Occurrences, Relations, Section, Subtasks } from "./task-sections";
import { availableActions, useWorkflow, type WorkflowTask } from "./workflow-actions";

export function TaskView({ task, compact }: { task: TaskDetail; compact?: boolean }) {
  const t = useTranslations("task");
  const ta = useTranslations("actions");
  const tcr = useTranslations("closeReason");
  const tc = useTranslations("common");
  const { me } = useApp();
  const { run } = useWorkflow();
  const ctx = { status: task.status, requesterId: task.requesterId, assigneeId: task.assigneeId };
  const canEdit = can(me, "edit_task", ctx);
  const wf: WorkflowTask = { id: task.id, key: task.key, title: task.title, status: task.status, requesterId: task.requesterId, assigneeId: task.assigneeId, priority: task.priority, suggestedPriority: task.suggestedPriority };
  const acts = availableActions(me, wf);
  const following = task.followers.some((f) => f.id === me.id);
  const mine = task.waitingOn === me.side;

  const prompt =
    task.status === "shipped" && me.side === "vendoor"
      ? ta("waitingVerify")
      : task.status === "needs_info" && me.side === "vendoor"
        ? ta("waitingVendoor")
        : task.status === "triage" && me.side === "abg"
          ? ta("triagePrompt")
          : null;

  return (
    <div className={cn("mx-auto max-w-[1200px]", compact ? "px-4 py-4" : "px-4 py-5 sm:px-6")}>
      {/* Breadcrumb */}
      <nav aria-label={t("breadcrumb")} className="mb-2 flex items-center gap-1 text-meta text-fg-secondary">
        <Link href={`/projects/${task.project.key.toLowerCase()}`} className="hover:text-fg hover:underline">
          {task.project.name}
        </Link>
        <ChevronRight size={12} aria-hidden />
        {task.parent && (
          <>
            <Link href={`/tasks/${task.parent.key}`} className="hover:text-fg hover:underline">
              <Mono>{task.parent.key}</Mono>
            </Link>
            <ChevronRight size={12} aria-hidden />
          </>
        )}
        <Mono className="text-fg">{task.key}</Mono>
      </nav>

      <div className={cn("grid gap-6", !compact && "lg:grid-cols-[minmax(0,1fr)_300px]")}>
        <div className="min-w-0 space-y-4">
          <EditableTitle task={task} canEdit={canEdit} />

          {/* Action bar (FR-6.1) */}
          <div className={cn("rounded-card border p-3", mine && acts.length ? "border-waiting/40 bg-info-subtle" : "border-border bg-surface")}>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={task.status} className="font-medium" />
              <WaitingBadge side={task.waitingOn} viewerSide={me.side} />
              {task.status === "closed" && task.closeReason && <span className="text-meta text-fg-secondary">{t("closedAs", { reason: tcr(task.closeReason as "duplicate") })}</span>}
              {task.status === "done" && task.verifiedBy && task.verifiedAt && (
                <span className="text-meta text-fg-secondary">{t("verifiedBy", { name: task.verifiedBy.name, when: formatExact(task.verifiedAt) })}</span>
              )}
              <div className="ms-auto flex items-center gap-1">
                <Button size="icon" variant="ghost" aria-label={following ? t("unfollow") : t("follow")} title={following ? t("unfollow") : t("follow")} onClick={() => setFollowAction(task.id, !following)}>
                  {following ? <BellOff size={15} aria-hidden /> : <Bell size={15} aria-hidden />}
                </Button>
                {(acts.includes("cancel") || me.role === "abg_lead") && task.status !== "done" && task.status !== "closed" && (
                  <Menu>
                    <MenuTrigger asChild>
                      <Button size="icon" variant="ghost" aria-label={tc("more")}>
                        <MoreHorizontal size={15} aria-hidden />
                      </Button>
                    </MenuTrigger>
                    <MenuContent align="end">
                      {acts.includes("cancel") && (
                        <MenuItem onSelect={() => run(wf, "cancel")}>
                          <Ban size={14} aria-hidden />
                          {ta("cancel")}
                        </MenuItem>
                      )}
                      {me.role === "abg_lead" && (
                        <MenuItem onSelect={() => run(wf, "propose_cancel")}>
                          <Ban size={14} aria-hidden />
                          {ta("proposeCancel")}
                        </MenuItem>
                      )}
                    </MenuContent>
                  </Menu>
                )}
              </div>
            </div>
            {prompt && <p className="mt-2 text-ui text-fg">{prompt}</p>}
            {acts.length > 0 ? (
              <ActionButtons task={wf} size="md" className="mt-3 flex flex-wrap gap-2 max-sm:sticky max-sm:bottom-16 max-sm:z-20 max-sm:-mx-3 max-sm:-mb-3 max-sm:rounded-b-card max-sm:border-t max-sm:border-border max-sm:bg-surface max-sm:p-3 [&>button]:max-sm:flex-1" />
            ) : null}
            {task.cancelProposed && (
              <div className="mt-3 rounded-control bg-warning-subtle p-2 text-ui">
                {t("cancelProposed", { name: task.cancelProposed.by, reason: task.cancelProposed.reason })}
                {acts.includes("cancel") && (
                  <Button size="sm" variant="dangerOutline" className="ms-2" onClick={() => run(wf, "cancel")}>
                    {t("confirmCancel")}
                  </Button>
                )}
              </div>
            )}
          </div>

          <Decision task={task} canEdit={can(me, "edit_decision", ctx)} />

          <Description task={task} canEdit={canEdit} />

          {(task.currentBehaviour || task.expectedBehaviour || task.whyItMatters || task.howOften) && (
            <Section id="det-title" title={t("details")}>
              <dl className="space-y-3">
                {task.currentBehaviour && <Detail label={t("currentBehaviour")} value={task.currentBehaviour} />}
                {task.expectedBehaviour && <Detail label={t("expectedBehaviour")} value={task.expectedBehaviour} />}
                {task.whyItMatters && <Detail label={t("whyItMatters")} value={task.whyItMatters} />}
                {task.howOften && <Detail label={t("howOften")} value={task.howOften} />}
              </dl>
            </Section>
          )}

          {task.attachments.length > 0 && (
            <Section id="att-title" title={t("attachments")} count={task.attachments.length}>
              <AttachmentsView items={task.attachments} />
            </Section>
          )}

          <CredentialsCard taskId={task.id} items={task.credentials} />

          {!task.parent && <Subtasks task={task} canEdit={can(me, "manage_subtasks", ctx)} />}
          <Occurrences task={task} />
          <Relations task={task} canEdit={can(me, "manage_relations", ctx)} />

          {compact && <Properties task={task} />}

          <TaskActivity task={task} wf={wf} />
        </div>

        {!compact && (
          <aside aria-label={t("properties")} className="lg:sticky lg:top-4 lg:self-start">
            <Properties task={task} />
          </aside>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-meta font-medium text-fg-secondary">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-body">{value}</dd>
    </div>
  );
}

function EditableTitle({ task, canEdit }: { task: TaskDetail; canEdit: boolean }) {
  const tc = useTranslations("common");
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(task.title);
  if (editing)
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await updateFieldAction({ taskId: task.id, field: "title", value: v });
          if (r.ok) setEditing(false);
          else toast.error(tc("error"));
        }}
      >
        <Input value={v} onChange={(e) => setV(e.target.value)} autoFocus onBlur={(e) => e.currentTarget.form?.requestSubmit()} className="h-10 text-title font-semibold" aria-label="Title" />
      </form>
    );
  return (
    <h1 className={cn("text-title font-semibold", task.status === "closed" && "text-fg-secondary line-through")}>
      {canEdit ? (
        <button type="button" className="text-start hover:bg-subtle rounded-control -mx-1 px-1" onClick={() => setEditing(true)}>
          {task.title}
        </button>
      ) : (
        task.title
      )}
    </h1>
  );
}

function Decision({ task, canEdit }: { task: TaskDetail; canEdit: boolean }) {
  const t = useTranslations("task");
  const tc = useTranslations("common");
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(task.decisionText ?? "");
  if (!task.decisionText && !editing)
    return canEdit ? (
      <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 text-meta text-fg-secondary hover:text-fg">
        <Pin size={12} aria-hidden />
        {t("addDecision")}
      </button>
    ) : null;
  return (
    <div className="rounded-card border border-[#c9cdf5] bg-[#f1f2fd] p-3" role="note" aria-label={t("decision")}>
      <div className="mb-1 flex items-center gap-1.5 text-meta font-semibold text-accent">
        <Pin size={12} aria-hidden />
        {t("decision")}
        {canEdit && !editing && (
          <button type="button" aria-label={tc("edit")} className="ms-auto rounded p-1 text-fg-secondary hover:bg-surface" onClick={() => setEditing(true)}>
            <Pencil size={12} aria-hidden />
          </button>
        )}
      </div>
      {editing ? (
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await updateFieldAction({ taskId: task.id, field: "decisionText", value: v.trim() || null });
            if (r.ok) setEditing(false);
            else toast.error(tc("error"));
          }}
        >
          <Textarea rows={2} value={v} onChange={(e) => setV(e.target.value)} autoFocus aria-label={t("decision")} placeholder={t("decisionHint")} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {tc("cancel")}
            </Button>
            <Button size="sm" type="submit" variant="primary">
              {tc("save")}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-body font-medium">{task.decisionText}</p>
          {task.decisionBy && task.decisionUpdatedAt && <p className="mt-1 text-meta text-fg-secondary">{t("decisionBy", { name: task.decisionBy, when: formatExact(task.decisionUpdatedAt) })}</p>}
        </>
      )}
    </div>
  );
}

function Description({ task, canEdit }: { task: TaskDetail; canEdit: boolean }) {
  const t = useTranslations("task");
  const tc = useTranslations("common");
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(task.description);
  return (
    <section aria-labelledby="desc-title">
      <div className="mb-1 flex items-center gap-2">
        <h2 id="desc-title" className="text-meta font-medium text-fg-secondary">
          {t("description")}
        </h2>
        {task.descriptionVersions > 0 && (
          <span className="inline-flex items-center gap-1 text-meta text-fg-muted" title="Edits are kept in History">
            <History size={11} aria-hidden />
            {task.descriptionVersions}
          </span>
        )}
        {canEdit && !editing && (
          <button type="button" aria-label={t("editDescription")} className="rounded p-1 text-fg-muted hover:bg-subtle hover:text-fg" onClick={() => setEditing(true)}>
            <Pencil size={12} aria-hidden />
          </button>
        )}
      </div>
      {editing ? (
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await updateFieldAction({ taskId: task.id, field: "description", value: v });
            if (r.ok) setEditing(false);
            else toast.error(tc("error"));
          }}
        >
          <Textarea rows={8} value={v} onChange={(e) => setV(e.target.value)} autoFocus aria-label={t("description")} className="font-mono text-[13px]" />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {tc("cancel")}
            </Button>
            <Button size="sm" type="submit" variant="primary">
              {tc("save")}
            </Button>
          </div>
        </form>
      ) : task.description ? (
        <Markdown>{task.description}</Markdown>
      ) : (
        <p className="text-ui text-fg-muted">{t("noDescription")}</p>
      )}
    </section>
  );
}

/** FR-6.8 properties column. Each field is editable inline when the viewer may change it. */
function Properties({ task }: { task: TaskDetail }) {
  const t = useTranslations("task");
  const ts = useTranslations("sla");
  const tp = useTranslations("priority");
  const tt = useTranslations("type");
  const tc = useTranslations("common");
  const { me, members, projects } = useApp();
  const ctx = { status: task.status, requesterId: task.requesterId, assigneeId: task.assigneeId };
  const save = async (field: Parameters<typeof updateFieldAction>[0]["field"], value: unknown) => {
    const r = await updateFieldAction({ taskId: task.id, field, value });
    if (!r.ok) toast.error(r.error === "forbidden" ? (r.message ?? tc("forbidden")) : tc("error"));
    else if (field === "projectId" && r.data?.key && r.data.key !== task.key) window.location.assign(`/tasks/${r.data.key}`);
  };
  const project = projects.find((p) => p.id === task.project.id);
  const abg = members.filter((m) => m.side === "abg");
  const canPriority = can(me, "set_priority", ctx);
  const canAssignee = can(me, "set_assignee", ctx);
  const canDue = can(me, "set_due", ctx);
  const canEdit = can(me, "edit_task", ctx);

  const clock = (c: TaskDetail["sla"]["firstResponse"], label: string) =>
    c.state !== "none" && (
      <div className="flex items-center justify-between text-meta">
        <span className="text-fg-secondary">{label}</span>
        <span
          className={cn(
            "font-medium",
            c.state === "breached" && "text-danger",
            c.state === "at_risk" && "text-[#8a5a00]",
            c.state === "met" && "text-st-done",
            c.state === "paused" && "text-fg-secondary",
          )}
          title={c.dueAt ? formatExact(c.dueAt) : undefined}
        >
          {ts(c.state as "ok")}
          {c.dueAt && c.state !== "met" && <> · <DueDate dueAt={c.dueAt} className="text-meta" /></>}
        </span>
      </div>
    );

  return (
    <div className="space-y-4 rounded-card border border-border bg-surface p-4">
      <h2 className="sr-only">{t("properties")}</h2>
      <dl className="space-y-2.5">
        <Prop label={t("status")}>
          <StatusBadge status={task.status} />
        </Prop>
        <Prop label={t("waitingOn")}>
          <WaitingBadge side={task.waitingOn} viewerSide={me.side} />
        </Prop>
        <Prop label={t("priority")} htmlFor="p-priority">
          {canPriority ? (
            <Select id="p-priority" value={task.priority ?? ""} onChange={(e) => save("priority", e.target.value || null)} className="h-7">
              <option value="">{tp("none")}</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {tp(p)}
                </option>
              ))}
            </Select>
          ) : (
            <span className="flex flex-col items-end gap-0.5">
              <PriorityBadge priority={task.priority} suggested={task.suggestedPriority} />
              {task.requesterId === me.id && !task.priority && (
                <Select aria-label={tp("suggested", { priority: "" })} value={task.suggestedPriority ?? ""} onChange={(e) => save("suggestedPriority", e.target.value || null)} className="h-7">
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {tp(p)}
                    </option>
                  ))}
                </Select>
              )}
            </span>
          )}
        </Prop>
        <Prop label={t("type")} htmlFor="p-type">
          {canEdit ? (
            <Select id="p-type" value={task.type} onChange={(e) => save("type", e.target.value)} className="h-7">
              {TASK_TYPES.map((x) => (
                <option key={x} value={x}>
                  {tt(x)}
                </option>
              ))}
            </Select>
          ) : (
            tt(task.type as "bug")
          )}
        </Prop>
        <Prop label={t("project")} htmlFor="p-project">
          {me.side === "abg" || me.role === "owner" || me.role === "admin" ? (
            <Select id="p-project" value={task.project.id} onChange={(e) => save("projectId", e.target.value)} className="h-7">
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.key} · {p.name}
                </option>
              ))}
            </Select>
          ) : (
            task.project.name
          )}
        </Prop>
        {project && project.categories.length > 0 && (
          <Prop label={t("category")} htmlFor="p-cat">
            {canEdit ? (
              <Select id="p-cat" value={task.category?.id ?? ""} onChange={(e) => save("categoryId", e.target.value || null)} className="h-7">
                <option value="">—</option>
                {project.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            ) : (
              (task.category?.name ?? "—")
            )}
          </Prop>
        )}
        <Prop label={t("requester")}>
          <span className="inline-flex items-center gap-1.5">
            <Avatar name={task.requester.name} size={18} />
            {task.requester.name}
          </span>
        </Prop>
        <Prop label={t("assignee")} htmlFor="p-assignee">
          {canAssignee ? (
            <Select id="p-assignee" value={task.assigneeId ?? ""} onChange={(e) => save("assigneeId", e.target.value || null)} className="h-7">
              <option value="">{tc("unassigned")}</option>
              {abg
                .filter((m) => canAssign(me, m.id) || m.id === task.assigneeId)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </Select>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={task.assignee?.name} size={18} />
              {task.assignee?.name ?? tc("unassigned")}
            </span>
          )}
        </Prop>
        <Prop label={t("due")} htmlFor="p-due">
          {canDue ? (
            <Input id="p-due" type="date" className={cn("h-7", task.isOverdue && "text-danger")} value={task.dueAt ? dateKey(task.dueAt) : ""} onChange={(e) => save("dueDate", e.target.value || null)} />
          ) : (
            <DueDate dueAt={task.dueAt} overdue={task.isOverdue} />
          )}
        </Prop>
        {task.release && (
          <Prop label={t("release")}>
            <Link href={`/releases/${task.release.number}`} className="font-mono text-[12px] hover:underline">
              {task.release.number}
            </Link>
          </Prop>
        )}
      </dl>

      <div className="space-y-1.5 border-t border-border pt-3">
        {clock(task.sla.firstResponse, ts("first_response"))}
        {clock(task.sla.resolution, ts("resolution"))}
      </div>

      <div className="space-y-2.5 border-t border-border pt-3">
        <div>
          <div className="mb-1 text-meta text-fg-secondary" id="p-acc">
            {t("accounts")}
          </div>
          <TagInput value={task.accounts} onChange={(v) => save("accounts", v)} placeholder={t("addTag")} describedBy="p-acc" />
        </div>
        <div>
          <div className="mb-1 text-meta text-fg-secondary" id="p-codes">
            {t("orderCodes")}
          </div>
          <TagInput value={task.orderCodes} onChange={(v) => save("orderCodes", v)} placeholder={t("addTag")} describedBy="p-codes" />
        </div>
      </div>

      <dl className="space-y-1.5 border-t border-border pt-3 text-meta">
        <Prop label={t("reopenCount")} small>
          <span className="tabular">{task.reopenCount}</span>
        </Prop>
        <Prop label={t("created")} small>
          <RelativeTime at={task.createdAt} className="text-meta" />
        </Prop>
        <Prop label={t("updated")} small>
          <RelativeTime at={task.updatedAt} className="text-meta" />
        </Prop>
        <Prop label={t("followers")} small>
          <span className="flex -space-x-1 rtl:space-x-reverse">
            {task.followers.map((f) => (
              <Avatar key={f.id} name={f.name} size={20} className="ring-2 ring-surface" />
            ))}
          </span>
        </Prop>
      </dl>
    </div>
  );
}

function Prop({ label, children, htmlFor, small }: { label: string; children: React.ReactNode; htmlFor?: string; small?: boolean }) {
  return (
    <div className={cn("grid grid-cols-[104px_minmax(0,1fr)] items-center gap-2", small ? "text-meta" : "text-ui")}>
      <dt className="text-fg-secondary">{htmlFor ? <label htmlFor={htmlFor}>{label}</label> : label}</dt>
      <dd className="flex min-w-0 justify-end text-end">{children}</dd>
    </div>
  );
}

void StatusIcon;
void ((x: TaskStatus | Priority) => x);
