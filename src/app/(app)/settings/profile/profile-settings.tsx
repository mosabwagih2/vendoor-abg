"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useApp } from "@/components/layout/app-context";

export function ProfileSettings({ name, email }: { name: string; email: string }) {
  const t = useTranslations("settings");
  const tr = useTranslations("roles");
  const tc = useTranslations("common");
  const { me } = useApp();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  return (
    <div className="space-y-6">
      <section className="flex items-center gap-3 rounded-card border border-border bg-surface p-4">
        <Avatar name={name} size={40} />
        <div>
          <div className="text-heading font-semibold">{name}</div>
          <div className="text-ui text-fg-secondary">
            {email} · {tr(me.role)}
          </div>
        </div>
      </section>
      <form
        className="max-w-sm space-y-3 rounded-card border border-border bg-surface p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await authClient.changePassword({ currentPassword: cur, newPassword: next, revokeOtherSessions: true });
          if (r.error) toast.error(r.error.message ?? tc("error"));
          else {
            toast.success(t("passwordChanged"));
            setCur("");
            setNext("");
          }
        }}
      >
        <h2 className="text-ui font-semibold">{t("changePassword")}</h2>
        <div>
          <Label htmlFor="pw-cur">{t("currentPassword")}</Label>
          <Input id="pw-cur" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="pw-new">{t("newPassword")}</Label>
          <Input id="pw-new" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <Button type="submit" variant="primary" size="sm">
          {tc("save")}
        </Button>
      </form>
    </div>
  );
}
