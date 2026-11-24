import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SignInForm } from "./sign-in-form";
import { getCurrentMember } from "@/server/session";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  if (await getCurrentMember()) redirect(sp.next?.startsWith("/") ? sp.next : "/home");
  const t = await getTranslations("auth");
  const devPassword = process.env.NODE_ENV !== "production" ? (process.env.SEED_PASSWORD ?? "Vendoor!2026") : null;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-card bg-primary font-mono text-[13px] font-semibold text-primary-fg">V×A</div>
          <h1 className="text-display font-semibold">{t("title")}</h1>
          <p className="text-ui text-fg-secondary">{t("subtitle")}</p>
        </div>
        <SignInForm next={sp.next?.startsWith("/") ? sp.next : "/home"} />
        {devPassword && <p className="mt-4 text-center text-meta text-fg-muted">{t("devHint", { password: devPassword })}</p>}
      </div>
    </main>
  );
}
