"use client";
import * as M from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export const Menu = M.Root;
export const MenuTrigger = M.Trigger;
export const MenuGroup = M.Group;

export function MenuContent({ className, align = "start", ...p }: M.DropdownMenuContentProps) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={4}
        collisionPadding={8}
        className={cn("z-50 max-h-[60vh] min-w-[180px] overflow-y-auto rounded-card border border-border bg-surface p-1 shadow-[var(--shadow-pop)]", className)}
        {...p}
      />
    </M.Portal>
  );
}

export function MenuItem({ className, checked, children, ...p }: M.DropdownMenuItemProps & { checked?: boolean }) {
  return (
    <M.Item
      className={cn(
        "flex min-h-8 cursor-default select-none items-center gap-2 rounded-control px-2 text-ui text-fg outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-subtle",
        className,
      )}
      {...p}
    >
      {children}
      {checked !== undefined && <Check size={14} className={cn("ms-auto", checked ? "opacity-100" : "opacity-0")} aria-hidden />}
    </M.Item>
  );
}

export function MenuLabel({ className, ...p }: M.DropdownMenuLabelProps) {
  return <M.Label className={cn("px-2 py-1 text-meta font-medium text-fg-secondary", className)} {...p} />;
}

export function MenuSeparator() {
  return <M.Separator className="my-1 h-px bg-border" />;
}
