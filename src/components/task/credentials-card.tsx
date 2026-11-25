"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ExternalLink, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Input, Label } from "@/components/ui/input";

import { useApp } from "@/components/layout/app-context";
import { addCredentialAction, archiveCredentialAction, updateCredentialAction } from "@/server/actions/tasks";
import { credentialCopyText } from "@/domain/credential-format";
import { cn } from "@/lib/cn";

export interface CredentialView {
  id: string;
  label: string | null;
  username: string;
  hasPassword: boolean;
  /** Shown as typed: accounts are shared between Vendoor and ABG. Null when there is none. */
  password: string | null;
  url: string | null;
  note: string | null;
  createdById: string;
  createdBy: string;
}

const DOTS = ["#2563eb", "#16a06a", "#f59e0b", "#8b5cf6", "#ec4899"];

/**
 * Accounts (Figma "Accounts"): logins the team needs to reproduce or fix the task.
 * Email and password are both visible, each with a Copy button, plus "Copy both".
 * Add as many accounts as needed; "Add another account" opens the next editor below the last one.
 */
export function CredentialsCard({ taskId, items, highlight }: { taskId: string; items: CredentialView[]; highlight?: boolean }) {
  const t = useTranslations("credentials");
  const [adding, setAdding] = useState(false);
  return (
    <section aria-labelledby="cred-title" className={cn("overflow-hidden rounded-card border bg-surface", highlight ? "border-accent" : "border-border")}>
      <header className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
        <KeyRound size={16} aria-hidden className="text-fg-secondary" />
        <h2 id="cred-title" className="text-[13.5px] font-semibold">
          {t("title")}
        </h2>
        {items.length > 0 && <span className="tabular rounded-full bg-sunken px-1.5 text-[11.5px] font-semibold text-fg-secondary">{items.length}</span>}
        <span className="hidden truncate text-[12.5px] text-fg-muted sm:inline">{t("shared")}</span>
        <Button size="sm" variant="secondary" className="ms-auto" onClick={() => setAdding(true)}>
          <Plus size={14} aria-hidden />
          {t("add")}
        </Button>
      </header>
      {!items.length && !adding && <p className="px-3.5 py-3 text-ui text-fg-muted">{t("empty")}</p>}
      {items.map((c, i) => (
        <CredentialItem key={c.id} c={c} dot={DOTS[i % DOTS.length]} />
      ))}
      {adding && (
        <div className="border-t border-border p-3">
          <CredentialEditor taskId={taskId} onDone={() => setAdding(false)} />
        </div>
      )}
      {!adding && (
        <button type="button" onClick={() => setAdding(true)} className="flex h-[42px] w-full items-center justify-center gap-2 border-t border-border text-[13px] font-semibold text-[#1d4ed8] hover:bg-info-subtle">
          <Plus size={15} aria-hidden />
          {t("addAnother")}
        </button>
      )}
    </section>
  );
}

function ValueRow({ label, value, copyLabel }: { label: string; value: string; copyLabel: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-16 shrink-0 text-[12.5px] text-fg-muted">{label}</span>
      <div className="flex h-[34px] min-w-0 flex-1 items-center gap-2 rounded-lg bg-canvas ps-3 pe-1.5">
        <span className="min-w-0 flex-1 truncate font-mono text-[13.5px]" title={value}>
          {value}
        </span>
        <CopyButton value={value} label={copyLabel} className="border border-border bg-surface" />
      </div>
    </div>
  );
}

function CredentialItem({ c, dot }: { c: CredentialView; dot: string }) {
  const t = useTranslations("credentials");
  const tc = useTranslations("common");
  const { me } = useApp();
  const [editing, setEditing] = useState(false);
  const canRemove = c.createdById === me.id || ["owner", "admin", "abg_lead"].includes(me.role);
  if (editing)
    return (
      <div className="border-b border-border p-3">
        <CredentialEditor taskId="" existing={c} onDone={() => setEditing(false)} />
      </div>
    );
  return (
    <div className="space-y-2 border-b border-border px-3.5 py-3">
      <div className="flex items-center gap-2">
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: dot }} />
        <span className="text-[13.5px] font-semibold">{c.label || t("untitled")}</span>
        {c.url && (
          <a href={c.url} target="_blank" rel="noreferrer noopener" className="inline-flex min-w-0 items-center gap-1 text-meta text-accent hover:underline">
            <ExternalLink size={12} aria-hidden />
            <span className="max-w-[180px] truncate">{c.url.replace(/^https?:\/\//, "")}</span>
          </a>
        )}
        <CopyButton value={credentialCopyText(c)} label={t("copyBoth")} className="ms-auto bg-canvas px-2 font-semibold text-fg">
          <span className="text-[12.5px]">{t("copyBoth")}</span>
        </CopyButton>
      </div>
      {c.username && <ValueRow label={t("emailShort")} value={c.username} copyLabel={t("copyUsername")} />}
      {c.password && <ValueRow label={t("password")} value={c.password} copyLabel={t("copyPassword")} />}
      {c.note && <p className="text-meta text-fg-secondary">{c.note}</p>}
      <div className="flex items-center gap-1 text-meta text-fg-muted">
        {t("addedBy", { name: c.createdBy })}
        <button type="button" aria-label={tc("edit")} className="ms-auto rounded p-1 hover:bg-subtle hover:text-fg" onClick={() => setEditing(true)}>
          <Pencil size={12} aria-hidden />
        </button>
        {canRemove && (
          <button
            type="button"
            aria-label={tc("remove")}
            className="rounded p-1 hover:bg-subtle hover:text-danger"
            onClick={async () => {
              if (!confirm(t("removeConfirm"))) return;
              const r = await archiveCredentialAction(c.id);
              if (!r.ok) toast.error(tc("error"));
            }}
          >
            <Trash2 size={12} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

function CredentialEditor({ taskId, existing, onDone }: { taskId: string; existing?: CredentialView; onDone: () => void }) {
  const t = useTranslations("credentials");
  const tc = useTranslations("common");
  const [label, setLabel] = useState(existing?.label ?? "");
  const [username, setUsername] = useState(existing?.username ?? "");
  const [password, setPassword] = useState(existing?.password ?? "");
  const [url, setUrl] = useState(existing?.url ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [busy, setBusy] = useState(false);
  const id = existing?.id ?? "new";
  return (
    <form
      className="grid gap-2 rounded-control border border-accent/40 bg-canvas p-2.5 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!username.trim() && !password) return;
        setBusy(true);
        const payload = { label, username, password: existing ? password || undefined : password, url, note };
        const r = existing ? await updateCredentialAction(existing.id, payload) : await addCredentialAction(taskId, payload);
        setBusy(false);
        if (r.ok) onDone();
        else toast.error(tc("error"));
      }}
    >
      <div className="sm:col-span-2">
        <Label htmlFor={`c-label-${id}`}>{t("label")}</Label>
        <Input id={`c-label-${id}`} value={label} placeholder={t("labelPlaceholder")} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div>
        <Label htmlFor={`c-user-${id}`}>{t("username")}</Label>
        <Input id={`c-user-${id}`} className="font-mono" autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
      </div>
      <div>
        <Label htmlFor={`c-pass-${id}`}>{t("password")}</Label>
        <Input id={`c-pass-${id}`} className="font-mono" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={existing?.hasPassword ? t("keepPassword") : undefined} />
      </div>
      <div>
        <Label htmlFor={`c-url-${id}`}>{t("url")}</Label>
        <Input id={`c-url-${id}`} value={url} placeholder="https://" onChange={(e) => setUrl(e.target.value)} />
      </div>
      <div>
        <Label htmlFor={`c-note-${id}`}>{t("note")}</Label>
        <Input id={`c-note-${id}`} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button size="sm" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button size="sm" type="submit" variant="primary" disabled={busy}>
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
