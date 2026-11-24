"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Eye, EyeOff, ExternalLink, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/forms/credential-fields";
import { useApp } from "@/components/layout/app-context";
import { addCredentialAction, archiveCredentialAction, revealCredentialAction, updateCredentialAction } from "@/server/actions/tasks";

export interface CredentialView {
  id: string;
  label: string | null;
  username: string;
  hasPassword: boolean;
  url: string | null;
  note: string | null;
  createdById: string;
  createdBy: string;
}

/**
 * Account access: logins the team needs to reproduce or fix the task. The email/username is shown in clear with a copy button;
 * the password is encrypted, masked by default, and every reveal or copy is logged.
 */
export function CredentialsCard({ taskId, items, highlight }: { taskId: string; items: CredentialView[]; highlight?: boolean }) {
  const t = useTranslations("credentials");
  const [adding, setAdding] = useState(false);
  return (
    <section aria-labelledby="cred-title" className={`rounded-card border bg-surface ${highlight ? "border-accent" : "border-border"}`}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <KeyRound size={15} aria-hidden className="text-fg-secondary" />
        <h2 id="cred-title" className="text-ui font-semibold">
          {t("title")}
        </h2>
        <span className="tabular text-meta text-fg-secondary">{items.length || ""}</span>
        <Button size="sm" variant="ghost" className="ms-auto" onClick={() => setAdding(true)}>
          <Plus size={14} aria-hidden />
          {t("add")}
        </Button>
      </div>
      <div className="space-y-2 p-3">
        {!items.length && !adding && <p className="px-1 text-meta text-fg-secondary">{t("empty")}</p>}
        {items.map((c) => (
          <CredentialItem key={c.id} c={c} />
        ))}
        {adding && <CredentialEditor taskId={taskId} onDone={() => setAdding(false)} />}
        <p className="px-1 text-meta text-fg-secondary">{t("hint")}</p>
      </div>
    </section>
  );
}

function CredentialItem({ c }: { c: CredentialView }) {
  const t = useTranslations("credentials");
  const tc = useTranslations("common");
  const { me } = useApp();
  const [shown, setShown] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const canRemove = c.createdById === me.id || ["owner", "admin", "abg_lead"].includes(me.role);

  const reveal = async (purpose: "view" | "copy") => {
    const r = await revealCredentialAction(c.id, purpose);
    if (!r.ok) {
      toast.error(tc("error"));
      throw new Error("reveal failed");
    }
    return r.data!.password;
  };

  if (editing) return <CredentialEditor taskId="" existing={c} onDone={() => setEditing(false)} />;

  return (
    <div className="rounded-control border border-border bg-canvas p-2.5">
      {(c.label || c.url) && (
        <div className="mb-1.5 flex items-center gap-2">
          {c.label && <span className="text-ui font-medium">{c.label}</span>}
          {c.url && (
            <a href={c.url} target="_blank" rel="noreferrer noopener" className="ms-auto inline-flex items-center gap-1 truncate text-meta text-accent hover:underline">
              <ExternalLink size={12} aria-hidden />
              <span className="max-w-[180px] truncate">{c.url.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
        </div>
      )}
      <dl className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1">
        <dt className="text-meta text-fg-secondary">{t("username")}</dt>
        <dd className="truncate font-mono text-[13px]" title={c.username}>
          {c.username || "—"}
        </dd>
        <dd>{c.username && <CopyButton value={c.username} label={t("copyUsername")} />}</dd>
        {c.hasPassword && (
          <>
            <dt className="text-meta text-fg-secondary">{t("password")}</dt>
            <dd className="truncate font-mono text-[13px]">{shown ?? "••••••••••"}</dd>
            <dd className="flex">
              <button
                type="button"
                aria-label={shown ? t("hidePassword") : t("showPassword")}
                className="inline-flex h-7 w-7 items-center justify-center rounded-control text-fg-secondary hover:bg-subtle hover:text-fg"
                onClick={async () => (shown ? setShown(null) : setShown(await reveal("view")))}
              >
                {shown ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
              </button>
              <CopyButton value={() => reveal("copy")} label={t("copyPassword")} />
            </dd>
          </>
        )}
      </dl>
      {c.note && <p className="mt-1.5 text-meta text-fg-secondary">{c.note}</p>}
      <div className="mt-1.5 flex items-center gap-1 text-meta text-fg-secondary">
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
  const [password, setPassword] = useState("");
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
        <PasswordInput id={`c-pass-${id}`} value={password} onChange={setPassword} placeholder={existing?.hasPassword ? t("keepPassword") : undefined} />
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
