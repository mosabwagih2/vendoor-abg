import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SignInForm } from "./sign-in-form";
import { getCurrentMember } from "@/server/session";

export const metadata = { title: "Sign in" };

const STEPS = ["Triage", "Planned", "In progress", "Shipped", "Done"];

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  if (await getCurrentMember()) redirect(sp.next?.startsWith("/") ? sp.next : "/home");
  const t = await getTranslations("auth");
  const devPassword = process.env.NODE_ENV !== "production" ? (process.env.SEED_PASSWORD ?? "Vendoor!2026") : null;
  return (
    <main className="grid min-h-dvh bg-canvas lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-fg lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-white font-mono text-[11px] font-semibold text-primary">V×A</span>
          <span className="text-[15px] font-semibold">Vendoor × ABG</span>
        </div>
        <div>
          <h2 className="font-serif text-[64px] leading-[0.98] tracking-[-0.02em]">{t("headline")}</h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/70">{t("pitch")}</p>
          <ol className="mt-10 grid max-w-lg grid-cols-5 gap-2" aria-hidden>
            {STEPS.map((s, i) => (
              <li key={s}>
                <span className="block h-1.5 rounded-full" style={{ background: i < 3 ? "#fff" : i === 3 ? "#60a5fa" : "rgba(255,255,255,0.18)" }} />
                <span className={`mt-2 block text-[11.5px] ${i === 3 ? "font-semibold text-white" : "text-white/60"}`}>{s}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-[12px] text-white/50">{t("footer")}</p>
        <div aria-hidden className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-[#2563eb]/30 blur-3xl" />
      </section>
      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[380px]">
          <div className="mb-7 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary font-mono text-[11px] font-semibold text-primary-fg">V×A</span>
          </div>
          <h1 className="font-serif text-[40px] leading-none tracking-[-0.02em]">{t("title")}</h1>
          <p className="mb-6 mt-2 text-body text-fg-secondary">{t("subtitle")}</p>
          <SignInForm next={sp.next?.startsWith("/") ? sp.next : "/home"} />
          {devPassword && <p className="mt-4 text-center text-meta text-fg-secondary">{t("devHint", { password: devPassword })}</p>}
        </div>
      </section>
    </main>
  );
}
