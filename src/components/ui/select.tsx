import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-12 w-full appearance-none rounded-xl border border-white/[0.14] bg-white/[0.06] px-4 pr-10 text-base text-parchment transition-colors focus:border-gold-400/70 focus:bg-white/[0.09] focus-visible:outline-none disabled:opacity-50 [&>option]:bg-night-800 [&>option]:text-parchment",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-400" />
    </div>
  )
);
Select.displayName = "Select";

export { Select };
