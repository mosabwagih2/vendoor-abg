import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// PRD 9.4: primary, secondary, ghost, danger; sm 28 px, md 32 px. Icon buttons keep a 28 px minimum target (WCAG 2.5.8 ≥ 24).
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control text-ui font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg shadow-[0_1px_2px_rgba(0,0,0,0.18)] hover:opacity-90",
        secondary: "border border-border-strong bg-surface text-fg hover:bg-subtle",
        ghost: "text-fg-secondary hover:bg-subtle hover:text-fg",
        danger: "bg-danger text-white hover:opacity-90",
        dangerOutline: "border border-[#f3c3bf] bg-surface text-danger-text hover:bg-danger-subtle",
        success: "bg-success-strong text-white shadow-[0_1px_2px_rgba(0,0,0,0.18)] hover:opacity-90",
        waiting: "bg-waiting-strong text-white shadow-[0_1px_2px_rgba(0,0,0,0.18)] hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-3.5",
        lg: "h-10 px-4 text-[14px]",
        icon: "h-7 w-7 p-0",
        iconMd: "h-8 w-8 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, type, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} type={asChild ? undefined : (type ?? "button")} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";
