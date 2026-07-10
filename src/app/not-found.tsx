import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { InstagramLink } from "@/components/common/InstagramLink";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col">
      <AppHeader />

      <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl border border-gold-500/40 bg-gold-500/10 text-gold-300">
          <Compass className="h-8 w-8" />
        </span>

        <p className="mt-6 font-display text-5xl font-bold text-gold-300">404</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-parchment">
          Página não encontrada
        </h1>
        <p className="mt-3 text-sm text-muted2">
          O caminho que você tentou acessar não existe ou a sala já foi encerrada. Que tal voltar ao
          início e começar uma nova partida?
        </p>

        <Link href="/" className={cn(buttonVariants({ variant: "gold", size: "lg" }), "mt-8")}>
          <Home className="h-4 w-4" /> Ir para o início
        </Link>
      </section>

      <footer className="mt-auto px-5 pb-8 text-center text-xs text-muted2/70">
        <div className="mb-4 flex justify-center">
          <InstagramLink />
        </div>
        <p className="font-display tracking-[0.2em]">
          “Lâmpada para os meus pés é a tua palavra.” — Salmos 119:105
        </p>
      </footer>
    </main>
  );
}
