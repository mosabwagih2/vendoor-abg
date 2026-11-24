"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface CredentialDraft {
  label?: string;
  username: string;
  password?: string;
  url?: string;
  note?: string;
}

/** Inline editor for Account access entries (used in New request and on the task page). */
export function CredentialFields({ value, onChange, idPrefix = "cred" }: { value: CredentialDraft[]; onChange: (v: CredentialDraft[]) => void; idPrefix?: string }) {
  const t = useTranslations("credentials");
  const tc = useTranslations("common");
  const set = (i: number, patch: Partial<CredentialDraft>) => onChange(value.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <div className="space-y-2">
      {value.map((c, i) => (
        <fieldset key={i} className="grid grid-cols-1 gap-2 rounded-card border border-border bg-surface p-3 sm:grid-cols-2">
          <legend className="sr-only">
            {t("title")} {i + 1}
          </legend>
          <div className="sm:col-span-2">
            <Label htmlFor={`${idPrefix}-label-${i}`}>{t("label")}</Label>
            <Input id={`${idPrefix}-label-${i}`} value={c.label ?? ""} placeholder={t("labelPlaceholder")} onChange={(e) => set(i, { label: e.target.value })} />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-user-${i}`}>{t("username")}</Label>
            <Input id={`${idPrefix}-user-${i}`} className="font-mono" autoComplete="off" value={c.username} onChange={(e) => set(i, { username: e.target.value })} />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-pass-${i}`}>{t("password")}</Label>
            <PasswordInput id={`${idPrefix}-pass-${i}`} value={c.password ?? ""} onChange={(v) => set(i, { password: v })} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor={`${idPrefix}-url-${i}`}>
              {t("url")} <span className="font-normal text-fg-secondary">({tc("optional")})</span>
            </Label>
            <Input id={`${idPrefix}-url-${i}`} value={c.url ?? ""} placeholder="https://" onChange={(e) => set(i, { url: e.target.value })} />
          </div>
          <div className="flex justify-end sm:col-span-2">
            <Button size="sm" variant="ghost" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Trash2 size={14} aria-hidden />
              {tc("remove")}
            </Button>
          </div>
        </fieldset>
      ))}
      <Button size="sm" onClick={() => onChange([...value, { username: "", password: "" }])}>
        <Plus size={14} aria-hidden />
        {t("add")}
      </Button>
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
