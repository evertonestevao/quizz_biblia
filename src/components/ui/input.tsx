import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-xl border border-white/[0.14] bg-white/[0.06] px-4 text-base text-parchment placeholder:text-muted2/70 transition-colors focus:border-gold-400/70 focus:bg-white/[0.09] focus-visible:outline-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
