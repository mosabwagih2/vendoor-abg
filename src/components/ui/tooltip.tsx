"use client";
import * as T from "@radix-ui/react-tooltip";

export const TooltipProvider = T.Provider;

export function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <T.Root delayDuration={300}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content sideOffset={4} className="z-50 max-w-xs rounded-control bg-primary px-2 py-1 text-meta text-primary-fg shadow-[var(--shadow-pop)]">
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
