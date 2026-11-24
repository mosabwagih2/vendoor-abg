"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";

export function SignInForm({ next }: { next: string }) {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <form
      className="space-y-3 rounded-card border border-border bg-surface p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const r = await authClient.signIn.email({ email, password });
        setPending(false);
        if (r.error) setError(t("invalid"));
        else window.location.assign(next);
      }}
    >
      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <FieldError>{error}</FieldError>
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? t("signingIn") : t("signIn")}
      </Button>
      <div className="flex items-center gap-2 text-meta text-fg-secondary">
        <span className="h-px flex-1 bg-border" />
        {t("or")}
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        variant="secondary"
        className="w-full"
        disabled={!email || pending}
        onClick={async () => {
          setPending(true);
          await authClient.signIn.magicLink({ email, callbackURL: next });
          setPending(false);
          setSent(true);
        }}
      >
        {t("magicLink")}
      </Button>
      {sent && (
        <p className="text-meta text-fg-secondary" role="status">
          {t("magicSent")}
        </p>
      )}
    </form>
  );
}
