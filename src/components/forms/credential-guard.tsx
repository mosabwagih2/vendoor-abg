"use client";
import { useTranslations } from "next-intl";
import { KeyRound } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** FR-6.11 adapted: warn before saving text that looks like a password and offer to move it into Account access. */
export function CredentialGuardDialog({
  open,
  onOpenChange,
  onMove,
  onPostAnyway,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onMove: () => void;
  onPostAnyway: () => void;
}) {
  const t = useTranslations("guard");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t("title")}>
        <div className="flex gap-3">
          <KeyRound className="mt-0.5 shrink-0 text-warning-text" size={20} aria-hidden />
          <p className="text-body text-fg-secondary">{t("body")}</p>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("edit")}
          </Button>
          <Button variant="secondary" onClick={onPostAnyway}>
            {t("postAnyway")}
          </Button>
          <Button variant="primary" onClick={onMove} autoFocus>
            {t("move")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
