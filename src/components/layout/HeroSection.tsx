import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <section className="mx-auto max-w-3xl px-5 pt-8 text-center sm:pt-14">
      <div className="animate-fadeUp">
        <Badge>
          <Sparkles className="h-3.5 w-3.5" /> Desafio das Escrituras
        </Badge>
      </div>
      <h1
        className="mt-6 animate-fadeUp font-display text-4xl font-bold leading-tight tracking-wide sm:text-6xl"
        style={{ animationDelay: "80ms" }}
      >
        Você conhece
        <br />
        <span className="gold-text">a Palavra?</span>
      </h1>
      <p
        className="mx-auto mt-5 max-w-xl animate-fadeUp text-base leading-relaxed text-muted2 sm:text-lg"
        style={{ animationDelay: "160ms" }}
      >
        Leia o versículo e descubra onde ele está na Bíblia. Treine sozinho ou
        crie uma sala e desafie seus amigos em tempo real.
      </p>
    </section>
  );
}
