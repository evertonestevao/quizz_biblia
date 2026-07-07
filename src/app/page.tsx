import { AppHeader } from "@/components/layout/AppHeader";
import { HeroSection } from "@/components/layout/HeroSection";
import { ModeCard } from "@/components/layout/ModeCard";
import { BookOpen, Users } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col">
      <AppHeader />
      <HeroSection />

      <section className="mx-auto grid w-full max-w-3xl gap-4 px-5 py-10 sm:grid-cols-2 sm:py-14">
        <ModeCard
          href="/solo"
          icon={BookOpen}
          title="Modo Solo"
          description="Perguntas infinitas para treinar sua memória bíblica no seu ritmo. Cada acerto vale 10 pontos."
          delay={240}
        />
        <ModeCard
          href="/amigos"
          icon={Users}
          title="Jogar com Amigos"
          description="Crie uma sala, compartilhe o código e dispute em tempo real. Quem responde certo primeiro pontua mais."
          highlight
          delay={320}
        />
      </section>

      <footer className="mt-auto px-5 pb-8 text-center text-xs text-muted2/70">
        <p className="font-display tracking-[0.2em]">
          “Lâmpada para os meus pés é a tua palavra.” — Salmos 119:105
        </p>
      </footer>
    </main>
  );
}
