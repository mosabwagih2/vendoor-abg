"use client";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
  wide,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  const t = useTranslations("common");
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-40 bg-black/30" />
      <D.Content
        className={cn(
          "fixed z-50 flex max-h-[100dvh] flex-col bg-surface shadow-[var(--shadow-pop)] focus:outline-none",
          "inset-0 sm:inset-auto sm:start-1/2 sm:top-[8vh] sm:max-h-[84vh] sm:-translate-x-1/2 rtl:sm:translate-x-1/2 sm:rounded-modal sm:border sm:border-border",
          wide ? "sm:w-[720px]" : "sm:w-[480px]",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <D.Title className="text-heading font-semibold">{title}</D.Title>
            {description ? <D.Description className="mt-0.5 text-meta text-fg-secondary">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          </div>
          <D.Close aria-label={t("close")} className="-me-1 rounded-control p-1 text-fg-secondary hover:bg-subtle hover:text-fg">
            <X size={16} />
          </D.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </D.Content>
    </D.Portal>
  );
}
