import Link from "next/link";
import { BookOpenText } from "lucide-react";

export function AppHeader() {
  return (
    <header className="flex h-16 items-center justify-center px-4">
      <Link href="/" className="group inline-flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg border border-gold-500/40 bg-gold-500/10 text-gold-300 transition-colors group-hover:bg-gold-500/20">
          <BookOpenText className="h-5 w-5" />
        </span>
        <span className="font-display text-lg font-semibold tracking-[0.18em] text-parchment">
          CRISTÃO <span className="gold-text">QUIZ</span>
        </span>
      </Link>
    </header>
  );
}
