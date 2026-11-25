import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { NotFoundArt } from "@/components/not-found-art";

export const metadata = { title: "Page not found" };

/** 404 for any unknown URL or a task/release that does not exist. Lives outside the app shell so it also works when signed out. */
export default async function NotFound() {
  const t = await getTranslations("notFoundPage");
  return (
    <main className="min-h-dvh bg-canvas">
      <header className="flex h-16 items-center gap-2.5 px-6 sm:px-8">
        <span className="grid h-7 w-7 place-items-center rounded-control bg-primary font-mono text-[10px] font-bold text-primary-fg">V×A</span>
        <span className="text-ui font-semibold text-fg">Vendoor × ABG</span>
      </header>
      <div className="mx-auto grid max-w-[1100px] items-center gap-10 px-6 pb-16 pt-6 md:grid-cols-[1fr_minmax(0,460px)] md:gap-16 md:pt-16">
        <div className="order-2 flex flex-col items-start gap-4 md:order-1">
          <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full bg-danger-subtle px-2.5 font-mono text-[12px] font-semibold tracking-[0.08em] text-danger-text">
            <TriangleAlert className="h-3.5 w-3.5" aria-hidden /> {t("badge")}
          </span>
          <h1 className="text-[44px] font-bold leading-[1.05] tracking-[-0.04em] text-fg sm:text-[64px]">{t("title")}</h1>
          <p className="text-[18px] font-semibold tracking-[-0.01em] text-fg-secondary sm:text-[24px]">{t("subtitle")}</p>
          <p className="max-w-[520px] text-[16px] leading-[25px] text-fg-secondary">{t("body")}</p>
          <div className="rounded-card bg-[#14161a] px-4 py-3 font-mono text-[13px] leading-5">
            <div className="text-[#8c93a1]">{t("termCommand", { path: "/tasks/VEN-9999" })}</div>
            <div className="text-[#7ee2a8]">{t("termResult")}</div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/inbox" className={buttonVariants({ variant: "waiting", size: "lg" })}>{t("backToInbox")}</Link>
            <Link href="/tasks" className={buttonVariants({ variant: "secondary", size: "lg" })}>{t("openAllTasks")}</Link>
          </div>
          <p className="text-meta text-fg-muted">{t("hint")}</p>
        </div>
        <NotFoundArt bubble={t("bubble")} tag={t("notFoundTag")} className="order-1 mx-auto w-full max-w-[460px] md:order-2" />
      </div>
    </main>
  );
}
