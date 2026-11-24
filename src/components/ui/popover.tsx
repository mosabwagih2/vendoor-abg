"use client";
import * as P from "@radix-ui/react-popover";
import { cn } from "@/lib/cn";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverClose = P.Close;

export function PopoverContent({ className, align = "start", ...p }: P.PopoverContentProps) {
  return (
    <P.Portal>
      <P.Content
        align={align}
        sideOffset={4}
        collisionPadding={8}
        className={cn("z-50 min-w-[200px] rounded-card border border-border bg-surface p-1 shadow-[var(--shadow-pop)] focus:outline-none", className)}
        {...p}
      />
    </P.Portal>
  );
}
