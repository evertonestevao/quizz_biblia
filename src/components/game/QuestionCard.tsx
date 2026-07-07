import { Quote } from "lucide-react";

interface QuestionCardProps {
  verseText: string;
  eyebrow?: string;
}

export function QuestionCard({ verseText, eyebrow }: QuestionCardProps) {
  return (
    <div className="glass-strong gold-frame animate-popIn p-7 text-center sm:p-10">
      {eyebrow && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
          {eyebrow}
        </p>
      )}
      <Quote className="mx-auto mb-4 h-6 w-6 rotate-180 text-gold-400/80" />
      <p className="font-display text-lg leading-relaxed text-parchment sm:text-2xl">
        {verseText}
      </p>
      <p className="mt-5 text-sm text-muted2">Onde está escrito este versículo?</p>
    </div>
  );
}
