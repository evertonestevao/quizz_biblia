import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        gold:
          "bg-gradient-to-b from-gold-300 to-gold-600 text-night-900 shadow-[0_4px_24px_rgba(212,169,78,0.35)] hover:brightness-110",
        outline:
          "border border-gold-500/50 text-gold-300 hover:bg-gold-500/10 hover:border-gold-400",
        ghost: "text-parchment/80 hover:bg-white/10 hover:text-parchment",
        subtle: "bg-white/10 text-parchment hover:bg-white/[0.16] border border-white/10",
        danger: "bg-red-500/15 text-red-300 border border-red-400/30 hover:bg-red-500/25",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-xs",
        lg: "h-13 px-8 py-3.5 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "gold", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
