"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, KeyRound, Plus, X } from "lucide-react";
import { Input, Label } from "@/components/ui/input";

export interface CredentialDraft {
  label?: string;
  username: string;
  password?: string;
  url?: string;
  note?: string;
}

/**
 * Accounts editor (Figma 1.4): Account 1, Account 2 … each with label, email and password (shown as typed).
 * "Add another account" always sits under the last block, so people add as many as they need.
 */
export function CredentialFields({ value, onChange, idPrefix = "cred" }: { value: CredentialDraft[]; onChange: (v: CredentialDraft[]) => void; idPrefix?: string }) {
  const t = useTranslations("credentials");
  const tc = useTranslations("common");
  const set = (i: number, patch: Partial<CredentialDraft>) => onChange(value.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const dots = ["#2563eb", "#16a06a", "#f59e0b", "#8b5cf6", "#ec4899"];
  return (
    <div className="space-y-2.5 rounded-card border border-border bg-subtle p-3">
      <div className="flex items-center gap-2">
        <KeyRound size={16} aria-hidden className="text-fg-secondary" />
        <h3 className="text-[13.5px] font-semibold">{t("title")}</h3>
        <span className="text-meta text-fg-muted">{t("formHint")}</span>
      </div>
      {value.map((c, i) => (
        <fieldset key={i} className="rounded-xl border border-border bg-surface p-3">
          <legend className="sr-only">
            {t("account", { n: i + 1 })}
          </legend>
          <div className="mb-2 flex items-center gap-2">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: dots[i % dots.length] }} />
            <span className="text-[13px] font-semibold">{t("account", { n: i + 1 })}</span>
            <button type="button" className="ms-auto inline-flex items-center gap-1 text-meta text-fg-muted hover:text-danger" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <X size={13} aria-hidden />
              {tc("remove")}
            </button>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <div>
              <Label htmlFor={`${idPrefix}-label-${i}`}>{t("label")}</Label>
              <Input id={`${idPrefix}-label-${i}`} value={c.label ?? ""} placeholder={t("labelPlaceholder")} onChange={(e) => set(i, { label: e.target.value })} />
            </div>
            <div>
              <Label htmlFor={`${idPrefix}-user-${i}`}>{t("emailShort")}</Label>
              <Input id={`${idPrefix}-user-${i}`} className="font-mono" autoComplete="off" value={c.username} onChange={(e) => set(i, { username: e.target.value })} />
            </div>
            <div>
              <Label htmlFor={`${idPrefix}-pass-${i}`}>{t("password")}</Label>
              <Input id={`${idPrefix}-pass-${i}`} className="font-mono" autoComplete="off" value={c.password ?? ""} onChange={(e) => set(i, { password: e.target.value })} />
            </div>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, { username: "", password: "" }])}
        className="flex h-[38px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#b9c6e8] bg-[#f6f9ff] text-[13px] font-semibold text-[#1d4ed8] hover:bg-info-subtle"
      >
        <Plus size={15} aria-hidden />
        {value.length ? t("addAnother") : t("add")}
      </button>
    </div>
  );
}

export function PasswordInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const t = useTranslations("credentials");
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} autoComplete="new-password" className="pe-9 font-mono" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      <button type="button" aria-label={show ? t("hidePassword") : t("showPassword")} className="absolute end-1 top-1/2 -translate-y-1/2 rounded p-1 text-fg-secondary hover:text-fg" onClick={() => setShow(!show)}>
        {show ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
      </button>
    </div>
  );
}
