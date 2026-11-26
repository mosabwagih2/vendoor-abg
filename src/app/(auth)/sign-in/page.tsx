import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Check, Clock, KeyRound, Lock } from "lucide-react";
import { SignInForm } from "./sign-in-form";
import { getCurrentMember } from "@/server/session";

export const metadata = { title: "Sign in" };

/** Figma 1.1: form on the left, a small preview of the product on the right. */
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  if (await getCurrentMember()) redirect(sp.next?.startsWith("/") ? sp.next : "/home");
  const t = await getTranslations("auth");
  const ts = await getTranslations("statusGroup");
  const devPassword = process.env.NODE_ENV !== "production" ? (process.env.SEED_PASSWORD ?? "Vendoor!2026") : null;
  const steps = [
    { label: ts("request"), tone: "#111318" },
    { label: ts("processing"), tone: "#111318" },
    { label: ts("completed"), tone: "#2563eb", current: true },
    { label: ts("done"), tone: "#d9deea" },
  ];
  const points = [
    { icon: Check, text: t("point1") },
    { icon: Clock, text: t("point2") },
    { icon: KeyRound, text: t("point3") },
  ];
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="flex flex-col bg-surface px-6 py-6 sm:px-10">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-primary font-mono text-[11px] font-semibold text-primary-fg">V×A</span>
          <span className="text-[15px] font-semibold">Vendoor × ABG</span>
        </div>
        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-10">
          <h1 className="text-[28px] font-bold tracking-[-0.02em]">{t("welcome")}</h1>
          <p className="mb-6 mt-2 text-body text-fg-secondary">{t("welcomeHint")}</p>
          <SignInForm next={sp.next?.startsWith("/") ? sp.next : "/home"} />
          <p className="mt-5 flex items-start gap-2 rounded-lg bg-canvas px-3 py-2.5 text-meta text-fg-secondary">
            <Lock size={13} className="mt-0.5 shrink-0" aria-hidden />
            {t("inviteOnly")}
          </p>
          {devPassword && <p className="mt-3 text-center text-meta text-fg-secondary">{t("devHint", { password: devPassword })}</p>}
        </div>
      </section>

      <section className="hidden flex-col justify-center bg-[#e8f0fe] px-14 lg:flex">
        <div className="max-w-[460px]">
          <h2 className="text-[40px] font-bold leading-[1.1] tracking-[-0.03em]">{t("headline")}</h2>
          <p className="mt-4 text-[16px] leading-6 text-fg-secondary">{t("pitch")}</p>
          <div aria-hidden className="mt-8 rounded-card border border-[#c9d8fb] bg-surface p-4 shadow-[0_4px_18px_rgba(37,99,235,0.10)]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-meta text-fg-secondary">VEN-30</span>
              <span className="inline-flex h-[22px] items-center gap-1.5 rounded-md bg-[#eaf1ff] px-2 text-[12px] font-medium text-[#1d4ed8]">
                <span className="h-[7px] w-[7px] rounded-full bg-[#2563eb]" />
                {ts("completed")}
              </span>
              <span className="inline-flex h-[22px] items-center rounded-full bg-accent px-2.5 text-[12px] font-semibold text-white">{t("yourTurn")}</span>
            </div>
            <div className="mt-2 text-[15px] font-semibold">{t("previewTitle")}</div>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {steps.map((s) => (
                <div key={s.label}>
                  <span className="block h-1 rounded-full" style={{ background: s.tone }} />
                  <span className={`mt-1 block text-[11px] ${s.current ? "font-semibold text-[#2563eb]" : "text-fg-secondary"}`}>{s.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <span className="inline-flex h-8 items-center gap-1.5 rounded-control bg-success-strong px-3 text-ui font-medium text-white">
                <Check size={14} />
                {t("works")}
              </span>
              <span className="inline-flex h-8 items-center rounded-control border border-[#f3c5c4] px-3 text-ui font-medium text-danger-text">{t("stillBroken")}</span>
            </div>
          </div>
          <ul className="mt-6 space-y-3">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-ui">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-surface text-accent">
                  <Icon size={13} aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
