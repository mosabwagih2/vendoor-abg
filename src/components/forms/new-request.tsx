"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertOctagon, Bug, HelpCircle, KeyRound, Lightbulb, Link as LinkIcon, PencilRuler, Power, TriangleAlert, Zap } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/input";
import { TagInput } from "@/components/ui/tag-input";
import { PriorityIcon } from "@/components/icons/priority-icon";
import { StatusIcon } from "@/components/icons/status-icon";
import { Mono } from "@/components/ui/badges";
import { cn } from "@/lib/cn";
import { useApp } from "@/components/layout/app-context";
import { AttachmentField } from "./attachment-field";
import { CredentialFields, type CredentialDraft } from "./credential-fields";
import { CredentialGuardDialog } from "./credential-guard";
import { FIELD_RULES, missingFields, type RequestField } from "@/domain/request-fields";
import { analyzeText, redactSecrets } from "@/domain/credential-guard";
import { PRIORITIES, type Priority, type TaskStatus, type TaskType } from "@/domain/types";
import type { UploadedRef } from "@/lib/upload";
import { addOccurrenceAction, createRequestAction, duplicatesAction } from "@/server/actions/tasks";
import { openIncidentAction } from "@/server/actions/misc";
import { INCIDENT_AFFECTED, INCIDENT_KINDS, appendLink, isSafeLink, type IncidentAffected, type IncidentKind } from "@/domain/incident";

const DRAFT_KEY = "new-request-draft-v1";
type Kind = Exclude<TaskType, "ops">;

interface Draft {
  type: Kind | null;
  projectId: string;
  categoryId: string;
  title: string;
  currentBehaviour: string;
  expectedBehaviour: string;
  whyItMatters: string;
  description: string;
  howOften: "" | "once" | "sometimes" | "always";
  isOrderRelated: boolean;
  accounts: string[];
  orderCodes: string[];
  suggestedPriority: "" | Priority;
  requesterId: string;
  attachments: UploadedRef[];
  subtasks: string;
}

const EMPTY: Draft = {
  type: null,
  projectId: "",
  categoryId: "",
  title: "",
  currentBehaviour: "",
  expectedBehaviour: "",
  whyItMatters: "",
  description: "",
  howOften: "",
  isOrderRelated: false,
  accounts: [],
  orderCodes: [],
  suggestedPriority: "",
  requesterId: "",
  attachments: [],
  subtasks: "",
};

const KINDS: Array<{ id: Kind; icon: typeof Bug }> = [
  { id: "bug", icon: Bug },
  { id: "change", icon: PencilRuler },
  { id: "feature", icon: Lightbulb },
  { id: "question", icon: HelpCircle },
];

export function NewRequestDialog({ open, onOpenChange, opts }: { open: boolean; onOpenChange: (o: boolean) => void; opts: { parentId?: string; projectId?: string; incident?: boolean } }) {
  const t = useTranslations("newRequest");
  // The dialog is remounted on every open (keyed in AppShell), so initial state is enough.
  const [incident, setIncident] = useState(!!opts.incident);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={incident ? t("reportTitle") : t("title")} wide>
        {incident ? <IncidentForm onDone={() => onOpenChange(false)} onBack={() => setIncident(false)} /> : <RequestForm opts={opts} onDone={() => onOpenChange(false)} onIncident={() => setIncident(true)} />}
      </DialogContent>
    </Dialog>
  );
}

function loadDraft(key: string | null): Draft | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Draft;
    if (!saved.title && !saved.currentBehaviour && !saved.type) return null;
    return { ...EMPTY, ...saved, attachments: (saved.attachments ?? []).map((a) => ({ ...a, previewUrl: undefined })) };
  } catch {
    return null;
  }
}

export function RequestForm({ opts, onDone, onIncident }: { opts: { parentId?: string; projectId?: string }; onDone: () => void; onIncident: () => void }) {
  const t = useTranslations("newRequest");
  const tt = useTranslations("type");
  const tp = useTranslations("priority");
  const tc = useTranslations("credentials");
  const tcom = useTranslations("common");
  const router = useRouter();
  const { me, projects, members } = useApp();
  // FR-7.4 local draft (passwords are never stored in the draft). Read once when the form mounts.
  const [initial] = useState(() => loadDraft(opts.parentId ? null : DRAFT_KEY));
  const [d, setD] = useState<Draft>(() => initial ?? { ...EMPTY, projectId: opts.projectId ?? "" });
  const [creds, setCreds] = useState<CredentialDraft[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [guardOpen, setGuardOpen] = useState(false);
  const [restored, setRestored] = useState(!!initial);
  const [dups, setDups] = useState<Array<{ id: string; key: string; title: string; status: string; occurrenceCount: number }>>([]);
  const credRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (opts.parentId) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {}
  }, [d, opts.parentId]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const project = projects.find((p) => p.id === d.projectId);
  const rules = d.type ? FIELD_RULES[d.type] : null;
  const show = (f: RequestField) => !!rules && rules[f] !== "hidden";
  const req = (f: RequestField) => !!rules && (rules[f] === "required" || (rules[f] === "required_if_order" && d.isOrderRelated));
  const missing = useMemo(
    () =>
      d.type
        ? missingFields({ ...d, type: d.type, howOften: d.howOften || null, suggestedPriority: d.suggestedPriority || null, parentId: opts.parentId ?? null })
        : ["type"],
    [d, opts.parentId],
  );
  const err = (f: string) => showErrors && missing.includes(f);

  // FR-7.2 possible duplicates as the title is typed.
  const lookForDups = !opts.parentId && d.title.trim().length >= 4;
  useEffect(() => {
    if (!lookForDups) return;
    const id = setTimeout(async () => setDups(await duplicatesAction(d.projectId || null, d.title)), 350);
    return () => clearTimeout(id);
  }, [d.title, d.projectId, lookForDups]);
  const shownDups = lookForDups ? dups : [];

  const allText = [d.title, d.currentBehaviour, d.expectedBehaviour, d.whyItMatters, d.description].join("\n");

  const submit = async (override = false) => {
    if (!d.type || !d.projectId || missing.length) {
      setShowErrors(true);
      toast.error(t("missing"));
      return;
    }
    if (!override && analyzeText(allText).level !== "none") {
      setGuardOpen(true);
      return;
    }
    setSubmitting(true);
    const r = await createRequestAction({
      type: d.type,
      projectId: d.projectId,
      categoryId: d.categoryId || null,
      title: d.title,
      description: d.description,
      currentBehaviour: d.currentBehaviour || null,
      expectedBehaviour: d.expectedBehaviour || null,
      whyItMatters: d.whyItMatters || null,
      howOften: d.howOften || null,
      isOrderRelated: d.isOrderRelated,
      accounts: d.accounts,
      orderCodes: d.orderCodes,
      suggestedPriority: d.suggestedPriority || null,
      requesterId: d.requesterId || null,
      attachments: d.attachments.map(({ previewUrl: _p, ...a }) => a),
      credentials: creds.filter((c) => c.username || c.password),
      parentId: opts.parentId ?? null,
      subtaskTitles: d.subtasks.split("\n").map((s) => s.replace(/^\s*(\d+[.)]|[-*•])\s*/, "").trim()).filter(Boolean),
      guardOverride: override,
    });
    setSubmitting(false);
    if (!r.ok) {
      toast.error(r.error === "invalid_input" ? t("missing") : tcom("error"));
      return;
    }
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    const key = r.data!.key;
    toast.success(t("created", { key }), { action: { label: t("view"), onClick: () => router.push(`/tasks/${key}`) } });
    onDone();
  };

  const moveToAccess = () => {
    const g = analyzeText(allText);
    setCreds((c) => [...c, { username: g.suggestion?.username ?? "", password: g.suggestion?.password ?? "" }]);
    setD((x) => ({
      ...x,
      title: redactSecrets(x.title),
      currentBehaviour: redactSecrets(x.currentBehaviour),
      expectedBehaviour: redactSecrets(x.expectedBehaviour),
      whyItMatters: redactSecrets(x.whyItMatters),
      description: redactSecrets(x.description),
    }));
    setGuardOpen(false);
    setTimeout(() => credRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const canFileOnBehalf = me.role !== "requester";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-5"
      noValidate
    >
      {restored && (
        <div className="flex items-center justify-between rounded-control bg-info-subtle px-3 py-2 text-ui" role="status">
          {t("draftRestored")}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setD({ ...EMPTY });
              setCreds([]);
              setRestored(false);
            }}
          >
            {t("discardDraft")}
          </Button>
        </div>
      )}

      {/* Step 1: what kind */}
      <section aria-labelledby="nr-kind">
        <h3 id="nr-kind" className="mb-2 text-ui font-semibold">
          1. {t("stepKind")}
        </h3>
        <div role="radiogroup" aria-labelledby="nr-kind" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {KINDS.map((k) => {
            const on = d.type === k.id;
            return (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => set("type", k.id)}
                className={cn("flex flex-col items-start gap-0.5 rounded-xl border p-3 text-start", on ? "border-accent bg-info-subtle text-[#1d4ed8]" : "border-border bg-surface hover:bg-subtle", err("type") && "border-danger")}
              >
                <k.icon size={16} aria-hidden />
                <span className="text-[12.5px] font-semibold">{tt(k.id)}</span>
                <span className={cn("text-[11.5px]", on ? "text-[#1d4ed8]/80" : "text-fg-muted")}>{t(`kindHint.${k.id}`)}</span>
              </button>
            );
          })}
          {!opts.parentId && (
            <button type="button" onClick={onIncident} title={t("systemDownHint")} className="flex flex-col items-start gap-0.5 rounded-xl border border-[#f3c5c4] bg-danger-subtle p-3 text-start text-danger-text hover:opacity-90">
              <AlertOctagon size={16} aria-hidden />
              <span className="text-[12.5px] font-semibold">{t("systemProblem")}</span>
              <span className="text-[11.5px] opacity-80">{t("systemProblemHint")}</span>
            </button>
          )}
        </div>
      </section>

      {/* Step 2: where */}
      {d.type && (
        <section aria-labelledby="nr-where">
          <h3 id="nr-where" className="mb-2 text-ui font-semibold">
            2. {t("stepWhere")}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="nr-project">{t("project")}</Label>
              <Select id="nr-project" value={d.projectId} aria-invalid={showErrors && !d.projectId} onChange={(e) => setD((x) => ({ ...x, projectId: e.target.value, categoryId: "" }))}>
                <option value="">—</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.key} · {p.name}
                  </option>
                ))}
              </Select>
            </div>
            {canFileOnBehalf && (
              <div>
                <Label htmlFor="nr-requester">{t("requester")}</Label>
                <Select id="nr-requester" value={d.requesterId} onChange={(e) => set("requesterId", e.target.value)}>
                  <option value="">{me.name}</option>
                  {members
                    .filter((m) => m.side === "vendoor" && m.id !== me.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </Select>
              </div>
            )}
          </div>
          {project && project.categories.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-meta font-medium text-fg-secondary" id="nr-cat">
                {t("category")}
              </div>
              <div role="radiogroup" aria-labelledby="nr-cat" className="flex flex-wrap gap-1.5">
                {project.categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={d.categoryId === c.id}
                    onClick={() => set("categoryId", d.categoryId === c.id ? "" : c.id)}
                    className={cn("h-7 rounded-full border px-3 text-ui", d.categoryId === c.id ? "border-accent bg-info-subtle text-accent" : "border-border hover:bg-subtle")}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Step 3: details by type */}
      {d.type && d.projectId && (
        <section aria-labelledby="nr-details" className="space-y-3">
          <h3 id="nr-details" className="text-ui font-semibold">
            3. {t("stepDetails")}
          </h3>
          <div>
            <Label htmlFor="nr-title">
              {t("titleLabel")} <Req />
            </Label>
            <Input id="nr-title" value={d.title} placeholder={t("titlePlaceholder")} aria-invalid={err("title")} onChange={(e) => set("title", e.target.value)} />
            {shownDups.length > 0 && (
              <div className="mt-2 rounded-card border border-border bg-warning-subtle p-2" role="region" aria-label={t("duplicates")}>
                <div className="text-meta font-medium">{t("duplicates")}</div>
                <p className="mb-1 text-meta text-fg-secondary">{t("duplicatesHint")}</p>
                <ul className="space-y-1">
                  {shownDups.map((x) => (
                    <li key={x.id} className="flex flex-wrap items-center gap-2 text-ui">
                      <StatusIcon status={x.status as TaskStatus} />
                      <Mono className="text-fg-secondary">{x.key}</Mono>
                      <span className="min-w-0 flex-1 truncate">{x.title}</span>
                      <Button
                        size="sm"
                        onClick={async () => {
                          const r = await addOccurrenceAction({
                            taskId: x.id,
                            accounts: d.accounts,
                            orderCodes: d.orderCodes,
                            note: [d.title, d.currentBehaviour, d.description].filter(Boolean).join("\n\n"),
                            attachments: d.attachments.map(({ previewUrl: _p, ...a }) => a),
                          });
                          if (r.ok) {
                            try {
                              localStorage.removeItem(DRAFT_KEY);
                            } catch {}
                            toast.success(t("occurrenceAdded", { key: x.key }), { action: { label: t("view"), onClick: () => router.push(`/tasks/${x.key}`) } });
                            onDone();
                          } else toast.error(tcom("error"));
                        }}
                      >
                        {t("addOccurrence")}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {show("currentBehaviour") && (
            <div>
              <Label htmlFor="nr-now">
                {t("currentBehaviour")} {req("currentBehaviour") ? <Req /> : <Opt />}
              </Label>
              <Textarea id="nr-now" rows={3} value={d.currentBehaviour} aria-invalid={err("currentBehaviour")} onChange={(e) => set("currentBehaviour", e.target.value)} />
            </div>
          )}
          {show("expectedBehaviour") && (
            <div>
              <Label htmlFor="nr-should">
                {t("expectedBehaviour")} {req("expectedBehaviour") ? <Req /> : <Opt />}
              </Label>
              <Textarea id="nr-should" rows={3} value={d.expectedBehaviour} aria-invalid={err("expectedBehaviour")} onChange={(e) => set("expectedBehaviour", e.target.value)} />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {show("accounts") && (
              <div>
                <Label htmlFor="nr-accounts">
                  {t("accounts")} {req("accounts") ? <Req /> : <Opt />}
                </Label>
                <TagInput id="nr-accounts" value={d.accounts} onChange={(v) => set("accounts", v)} placeholder={t("accountsHint")} invalid={err("accounts")} />
              </div>
            )}
            {show("orderCodes") && (
              <div>
                <Label htmlFor="nr-orders">
                  {t("orderCodes")} {req("orderCodes") ? <Req /> : <Opt />}
                </Label>
                <TagInput id="nr-orders" value={d.orderCodes} onChange={(v) => set("orderCodes", v)} placeholder={t("orderCodesHint")} invalid={err("orderCodes")} />
                {d.type === "bug" && (
                  <label className="mt-1.5 flex items-center gap-2 text-ui">
                    <input type="checkbox" checked={d.isOrderRelated} onChange={(e) => set("isOrderRelated", e.target.checked)} className="h-4 w-4" />
                    {t("orderRelated")}
                  </label>
                )}
              </div>
            )}
          </div>

          {show("attachments") && (
            <div>
              <div className="mb-1 text-meta font-medium text-fg-secondary">
                {t("evidence")} {req("attachments") ? <Req /> : <Opt />}
              </div>
              <AttachmentField value={d.attachments} onChange={(v) => set("attachments", v)} invalid={err("attachments")} onBusyChange={setUploading} />
              <FieldError>{err("attachments") ? t("evidenceRequired") : null}</FieldError>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {show("howOften") && (
              <fieldset>
                <legend className="mb-1 text-meta font-medium text-fg-secondary">
                  {t("howOften")} <Req />
                </legend>
                <div className="flex gap-1.5">
                  {(["once", "sometimes", "always"] as const).map((h) => (
                    <button
                      key={h}
                      type="button"
                      aria-pressed={d.howOften === h}
                      onClick={() => set("howOften", h)}
                      className={cn("h-8 flex-1 rounded-control border text-ui", d.howOften === h ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface hover:bg-subtle", err("howOften") && "border-danger")}
                    >
                      {t(h)}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {show("suggestedPriority") && (
              <fieldset>
                <legend className="mb-1 text-meta font-medium text-fg-secondary">
                  {t("suggestedPriority")} <Req />
                </legend>
                <div className="grid grid-cols-4 gap-1.5">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={d.suggestedPriority === p}
                      onClick={() => set("suggestedPriority", p)}
                      className={cn(
                        "inline-flex h-8 items-center justify-center gap-1 rounded-control border text-ui",
                        d.suggestedPriority === p ? "border-primary bg-subtle font-medium" : "border-border bg-surface hover:bg-subtle",
                        err("suggestedPriority") && "border-danger",
                      )}
                    >
                      <PriorityIcon priority={p} />
                      {tp(p)}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </div>

          {show("whyItMatters") && (
            <div>
              <Label htmlFor="nr-why">
                {t("whyItMatters")} {req("whyItMatters") ? <Req /> : <Opt />}
              </Label>
              <Textarea id="nr-why" rows={2} value={d.whyItMatters} aria-invalid={err("whyItMatters")} onChange={(e) => set("whyItMatters", e.target.value)} />
            </div>
          )}

          <div>
            <Label htmlFor="nr-desc">
              {t("description")} <Opt />
            </Label>
            <Textarea id="nr-desc" rows={3} value={d.description} onChange={(e) => set("description", e.target.value)} />
          </div>

          {(d.type === "change" || d.type === "feature") && !opts.parentId && (
            <div>
              <Label htmlFor="nr-sub">
                {t("subtasksFromPdf")} <Opt />
              </Label>
              <Textarea id="nr-sub" rows={3} value={d.subtasks} placeholder={"1. …\n2. …"} onChange={(e) => set("subtasks", e.target.value)} />
              <p className="mt-1 text-meta text-fg-secondary">{t("subtasksFromPdfHint")}</p>
            </div>
          )}

          <div ref={credRef} className="rounded-card bg-subtle p-3">
            <div className="mb-1 flex items-center gap-1.5 text-ui font-semibold">
              <KeyRound size={14} aria-hidden />
              {tc("title")} <Opt />
            </div>
            <p className="mb-2 text-meta text-fg-secondary">{tc("hint")}</p>
            <CredentialFields value={creds} onChange={setCreds} idPrefix="nr-cred" />
          </div>
        </section>
      )}

      <div className="sticky bottom-0 -mx-4 -mb-4 flex items-center justify-end gap-2 border-t border-border bg-surface px-4 py-3">
        <Button variant="ghost" onClick={onDone}>
          {tcom("cancel")}
        </Button>
        <Button type="submit" variant="primary" disabled={submitting || uploading || !d.type}>
          {submitting ? t("submitting") : t("submit")}
        </Button>
      </div>

      <CredentialGuardDialog
        open={guardOpen}
        onOpenChange={setGuardOpen}
        onMove={moveToAccess}
        onPostAnyway={() => {
          setGuardOpen(false);
          void submit(true);
        }}
      />
    </form>
  );
}

function Req() {
  const t = useTranslations("common");
  return (
    <span className="text-danger" aria-label={t("required")} title={t("required")}>
      *
    </span>
  );
}
function Opt() {
  const t = useTranslations("common");
  return <span className="font-normal text-fg-secondary">({t("optional")})</span>;
}

/** Figma 7.3: step 2 of reporting a system problem. Kind, start time, who is affected, what they see, and whether to alert ABG now. */
function IncidentForm({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const t = useTranslations("incident");
  const tc = useTranslations("common");
  const [kind, setKind] = useState<IncidentKind>("down");
  const [affected, setAffected] = useState<IncidentAffected>("everyone");
  const [startedAt, setStartedAt] = useState(() => toLocalInput(new Date()));
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState<UploadedRef[]>([]);
  const [uploading, setUploading] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [alert, setAlert] = useState(true);
  const [busy, setBusy] = useState(false);
  const KINDS = { down: Power, slow: Zap, other: TriangleAlert } as const;
  const tone = { down: "border-danger bg-danger-subtle", slow: "border-[#f3d98b] bg-warning-subtle", other: "border-border bg-subtle" } as const;
  const chip = { down: "bg-danger text-white", slow: "bg-[#fbe3a0] text-warning-text", other: "bg-subtle text-fg-secondary" } as const;
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await openIncidentAction({
          kind,
          scope: t(`affected.${affected}`),
          details,
          startedAt: new Date(startedAt).toISOString(),
          alert,
          attachments: files.map((f) => ({ key: f.key, fileName: f.fileName, mime: f.mime, size: f.size, durationSec: f.durationSec ?? null })),
        });
        setBusy(false);
        if (r.ok) {
          toast.success(t("created", { number: r.data!.number }));
          onDone();
        } else toast.error(tc("error"));
      }}
    >
      <div role="radiogroup" aria-label={t("what")} className="grid gap-2 sm:grid-cols-3">
        {INCIDENT_KINDS.map((k) => {
          const Icon = KINDS[k];
          return (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={cn("rounded-xl border p-3 text-start", kind === k ? tone[k] + " ring-1 ring-current/10" : "border-border bg-surface hover:bg-subtle")}>
              <span className={cn("grid h-7 w-7 place-items-center rounded-lg", chip[k])}>
                <Icon size={15} aria-hidden />
              </span>
              <span className="mt-2 block text-ui font-semibold">{t(`kind.${k}`)}</span>
              <span className="block text-meta text-fg-secondary">{t(`kindHint.${k}`)}</span>
            </button>
          );
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="inc-start">{t("startedAt")}</Label>
          <Input id="inc-start" type="datetime-local" value={startedAt} max={toLocalInput(new Date())} onChange={(e) => setStartedAt(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="inc-affected">{t("affectedLabel")}</Label>
          <Select id="inc-affected" value={affected} onChange={(e) => setAffected(e.target.value as IncidentAffected)}>
            {INCIDENT_AFFECTED.map((a) => (
              <option key={a} value={a}>
                {t(`affected.${a}`)}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="inc-details">{t("details")}</Label>
        <Textarea id="inc-details" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} required minLength={3} />
      </div>
      <AttachmentField value={files} onChange={setFiles} compact onBusyChange={setUploading} />
      <div>
        <Button type="button" size="sm" variant="secondary" onClick={() => setLinkOpen((o) => !o)}>
          <LinkIcon size={14} aria-hidden />
          {t("addLink")}
        </Button>
        {linkOpen && (
          <div className="mt-2 flex gap-2">
            <Input aria-label={t("addLink")} type="url" placeholder="https://…" value={link} onChange={(e) => setLink(e.target.value)} />
            <Button
              type="button"
              variant="secondary"
              disabled={!isSafeLink(link)}
              onClick={() => {
                setDetails(appendLink(details, link));
                setLink("");
                setLinkOpen(false);
              }}
            >
              {tc("add")}
            </Button>
          </div>
        )}
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-danger-subtle p-3 text-danger-text">
        <input type="checkbox" role="switch" checked={alert} onChange={(e) => setAlert(e.target.checked)} className="mt-1 h-4 w-4 accent-[#e5484d]" />
        <span>
          <span className="block text-ui font-semibold">{t("alertNow")}</span>
          <span className="block text-meta">{t("alertHint")}</span>
        </span>
      </label>
      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="text-meta text-fg-secondary">{t("stepNote")}</span>
        <span className="flex gap-2">
          <Button variant="ghost" onClick={onBack}>
            {t("back")}
          </Button>
          <Button type="submit" variant="danger" disabled={busy || uploading}>
            <AlertOctagon size={15} aria-hidden />
            {t("submit")}
          </Button>
        </span>
      </div>
    </form>
  );
}

/** "YYYY-MM-DDTHH:mm" in the browser's local time, the format datetime-local inputs use. */
function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
