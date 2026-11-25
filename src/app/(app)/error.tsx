"use client";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown inside the app frame when a page throws. The sidebar stays, so people can navigate away. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorPage");
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-danger-subtle text-danger">
        <TriangleAlert size={20} aria-hidden />
      </span>
      <h1 className="text-heading font-semibold">{t("title")}</h1>
      <p className="text-ui text-fg-secondary">{t("body")}</p>
      {error.digest && <p className="font-mono text-meta text-fg-muted">{t("reference", { id: error.digest })}</p>}
      <Button variant="primary" onClick={reset}>
        {t("retry")}
      </Button>
    </div>
  );
}
