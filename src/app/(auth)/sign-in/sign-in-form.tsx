"use client";
import { useState } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
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
  const [show, setShow] = useState(false);
  /** "Forgot password?" and "Email me a sign-in link" are the same thing: a one-time link to the work email. */
  async function sendLink() {
    setPending(true);
    await authClient.signIn.magicLink({ email, callbackURL: next });
    setPending(false);
    setSent(true);
  }

  return (
    <form
      className="space-y-3.5"
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
        <div className="relative">
          <Mail size={15} aria-hidden className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-fg-muted" />
          <Input id="email" type="email" className="h-10 ps-9" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <Label htmlFor="password">{t("password")}</Label>
          <button type="button" className="text-meta font-medium text-accent hover:underline disabled:opacity-50" disabled={!email || pending} onClick={sendLink}>
            {t("forgot")}
          </button>
        </div>
        <div className="relative">
          <Lock size={15} aria-hidden className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-fg-muted" />
          <Input id="password" type={show ? "text" : "password"} className="h-10 ps-9 pe-10" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" aria-label={t("toggleChars")} aria-pressed={show} onClick={() => setShow(!show)} style={{ insetInlineEnd: 8 }} className="absolute top-1/2 -translate-y-1/2 rounded p-1 text-fg-muted hover:text-fg">
            {show ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
          </button>
        </div>
      </div>
      <FieldError>{error}</FieldError>
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
        {pending ? t("signingIn") : t("signIn")}
      </Button>
      <div className="flex items-center gap-2 text-meta text-fg-secondary">
        <span className="h-px flex-1 bg-border" />
        {t("orWithEmail")}
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        disabled={!email || pending}
        onClick={sendLink}
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
