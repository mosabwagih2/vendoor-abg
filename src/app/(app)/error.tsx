"use client";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/page-header";
import { useApp } from "@/components/layout/app-context";

/** Shown inside the app frame when a page throws (Figma 10.4). The sidebar stays, so people can navigate away. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorPage");
  const { openNewRequest } = useApp();
  return (
    <div role="alert">
      <EmptyState title={t("title")} body={t("body")} tone="danger" icon={TriangleAlert}>
        {error.digest && <p className="w-full text-meta text-fg-muted">{t("reference", { id: error.digest })}</p>}
        <Button variant="primary" className="bg-accent text-white" onClick={reset}>
          {t("retry")}
        </Button>
        <Button variant="secondary" onClick={() => openNewRequest({ incident: true })}>
          {t("report")}
        </Button>
      </EmptyState>
    </div>
  );
}
