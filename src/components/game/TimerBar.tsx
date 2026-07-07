"use client";

import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimerBarProps {
  secondsLeft: number;
  totalSeconds: number;
}

export function TimerBar({ secondsLeft, totalSeconds }: TimerBarProps) {
  const ratio = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0;
  const critical = secondsLeft <= 5;

  return (
    <div className="glass flex items-center gap-3 px-4 py-3">
      <Timer className={cn("h-5 w-5 shrink-0", critical ? "text-red-300" : "text-gold-300")} />
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-linear",
            critical
              ? "bg-gradient-to-r from-red-500 to-red-400"
              : "bg-gradient-to-r from-gold-600 to-gold-300"
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <span
        className={cn(
          "w-10 text-right font-display text-lg font-bold tabular-nums",
          critical ? "text-red-300" : "text-gold-300"
        )}
      >
        {Math.max(0, secondsLeft)}s
      </span>
    </div>
  );
}
