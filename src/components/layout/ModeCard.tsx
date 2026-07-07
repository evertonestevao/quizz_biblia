import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

interface ModeCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  highlight?: boolean;
  delay?: number;
}

export function ModeCard({ href, icon: Icon, title, description, highlight, delay = 0 }: ModeCardProps) {
  return (
    <Link
      href={href}
      className={`glass group relative flex animate-fadeUp flex-col gap-3 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gold-400/50 ${
        highlight ? "border-gold-500/40 animate-glow" : ""
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="grid h-12 w-12 place-items-center rounded-xl border border-gold-500/40 bg-gold-500/10 text-gold-300">
        <Icon className="h-6 w-6" />
      </span>
      <h2 className="font-display text-xl font-semibold tracking-wide text-parchment">{title}</h2>
      <p className="text-sm leading-relaxed text-muted2">{description}</p>
      <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-300">
        Jogar agora
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
