"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnswerOptionProps {
  reference: string;
  index: number;
  disabled: boolean;
  revealed: boolean;
  isCorrect: boolean;
  isSelected: boolean;
  onSelect: (reference: string) => void;
}

const LETTERS = ["A", "B", "C", "D"];

export function AnswerOption({
  reference,
  index,
  disabled,
  revealed,
  isCorrect,
  isSelected,
  onSelect,
}: AnswerOptionProps) {
  const showCorrect = revealed && isCorrect;
  const showWrong = revealed && isSelected && !isCorrect;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(reference)}
      className={cn(
        "glass flex w-full items-center gap-3 p-4 text-left transition-all duration-200",
        !disabled && "hover:-translate-y-0.5 hover:border-gold-400/60 hover:bg-white/[0.09]",
        disabled && !revealed && "opacity-70",
        isSelected && !revealed && "border-gold-400/70 bg-gold-500/10",
        showCorrect && "border-emerald-400/70 bg-emerald-500/15",
        showWrong && "border-red-400/70 bg-red-500/15"
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-sm font-bold",
          showCorrect
            ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-300"
            : showWrong
              ? "border-red-400/60 bg-red-500/20 text-red-300"
              : "border-gold-500/40 bg-gold-500/10 text-gold-300"
        )}
      >
        {LETTERS[index] ?? index + 1}
      </span>
      <span className="flex-1 font-medium text-parchment">{reference}</span>
      {showCorrect && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />}
      {showWrong && <XCircle className="h-5 w-5 shrink-0 text-red-300" />}
    </button>
  );
}
