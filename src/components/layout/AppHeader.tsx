import Link from "next/link";
import { BookOpenText } from "lucide-react";

export function AppHeader() {
  return (
    <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-5">
      <Link href="/" className="group inline-flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg border border-gold-500/40 bg-gold-500/10 text-gold-300 transition-colors group-hover:bg-gold-500/20">
          <BookOpenText className="h-5 w-5" />
        </span>
        <span className="font-display text-lg font-semibold tracking-[0.18em] text-parchment">
          VERBUM <span className="gold-text">QUIZ</span>
        </span>
      </Link>
    </header>
  );
}
