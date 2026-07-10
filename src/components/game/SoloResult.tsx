"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { InstagramLink } from "@/components/common/InstagramLink";
import { SOLO_POINTS_PER_CORRECT } from "@/lib/game";
import { shareResultImage } from "@/lib/shareImage";
import type { SoloStats } from "@/types/game";
import {
  BookOpenText,
  Check,
  Home,
  ImageDown,
  RotateCcw,
  Share2,
  Trophy,
} from "lucide-react";

interface SoloResultProps {
  playerName: string;
  versionLabel: string;
  stats: SoloStats;
  onRestart: () => void;
}

/** Mensagem calorosa de desempenho conforme o aproveitamento. */
function performanceLabel(pct: number, answered: number): string {
  if (answered === 0) return "Bora começar!";
  if (pct >= 90) return "Impressionante! 🏆";
  if (pct >= 70) return "Você mandou muito bem! 🔥";
  if (pct >= 50) return "Belo desempenho! 👏";
  if (pct >= 30) return "Tá no caminho certo! 🌱";
  return "Cada partida te deixa melhor! 💪";
}

/**
 * Tela final da partida solo — pensada para virar print de compartilhamento:
 * um card único, caloroso e com a marca do app. Usa a Web Share API quando
 * disponível e, sem suporte, copia o resumo para a área de transferência.
 */
export function SoloResult({
  playerName,
  versionLabel,
  stats,
  onRestart,
}: SoloResultProps) {
  const [copied, setCopied] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);

  const { answered, correct } = stats;
  const pct = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  const score = correct * SOLO_POINTS_PER_CORRECT;
  const message = performanceLabel(pct, answered);

  const boardStats = [
    { label: "Acertos", value: correct },
    { label: "Perguntas", value: answered },
  ];

  async function handleShare() {
    const appUrl = typeof window !== "undefined" ? window.location.origin : "";
    const message =
      `📖 Cristão Quiz — joguei e fiz ${score} pontos!\n` +
      `Acertei ${correct} de ${answered} referências (${pct}% de aproveitamento).\n` +
      `Consegue superar? ${appUrl}`;

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({
          title: "Meu resultado no Cristão Quiz",
          text: message,
        });
      } catch {
        // Cancelou ou falhou: ignora.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível: ignora silenciosamente
    }
  }

  async function handleShareImage() {
    if (imgBusy) return;
    setImgBusy(true);
    try {
      await shareResultImage({
        modeLabel: "Solo",
        playerName,
        score,
        correct,
        answered,
        pct,
        message,
        versionLabel,
      });
    } catch {
      // Se a geração da imagem falhar, cai no compartilhamento em texto.
      await handleShare();
    } finally {
      setImgBusy(false);
    }
  }

  return (
    <main className="min-h-dvh pb-12">
      <AppHeader />
      <div className="mx-auto max-w-xl space-y-6 px-5">
        {/* Card principal — é o que a pessoa vai printar/compartilhar. */}
        <div className="gold-frame relative overflow-hidden rounded-3xl border border-gold-500/30 bg-gradient-to-b from-night-800 to-night-900 px-6 py-9 text-center shadow-[0_20px_60px_rgba(0,0,0,0.5)] animate-fadeUp">
          {/* Brilho decorativo ao fundo */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-gold-500/20 blur-3xl"
          />

          <div className="relative">
            {/* Marca (para o print carregar a identidade do app) */}
            <div className="flex items-center justify-center gap-2 text-gold-300">
              <BookOpenText className="h-5 w-5" />
              <span className="font-display text-sm font-semibold tracking-[0.22em]">
                CRISTÃO QUIZ
              </span>
            </div>

            <p className="mt-6 text-sm text-muted2">
              Parabéns,{" "}
              <span className="font-semibold text-parchment">{playerName}</span>
              ! 🎉
            </p>

            <span className="mx-auto mt-4 grid h-20 w-20 place-items-center rounded-full border border-gold-500/40 bg-gold-500/10 text-gold-300 shadow-[0_0_40px_rgba(212,169,78,0.25)]">
              <Trophy className="h-10 w-10" />
            </span>

            <p className="mt-5 font-display text-6xl font-bold gold-text">
              {score}
            </p>
            <p className="text-xs uppercase tracking-[0.3em] text-muted2">
              pontos
            </p>

            <p className="mt-4 font-display text-xl font-semibold text-parchment">
              {message}
            </p>

            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              {pct}% de aproveitamento
            </span>

            {/* Números da partida */}
            <div className="mt-7 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03] py-4">
              {boardStats.map((stat) => (
                <div key={stat.label} className="px-2">
                  <p className="font-display text-2xl font-bold text-parchment">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted2">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-7 font-display text-xs tracking-[0.15em] text-muted2/80">
              “Lâmpada para os meus pés é a tua palavra.” — Sl 119:105
            </p>
            {versionLabel && (
              <p className="mt-1 text-[10px] uppercase tracking-widest text-muted2/60">
                {versionLabel}
              </p>
            )}
          </div>
        </div>

        {/* Ações (ficam fora do card do print) */}
        <div className="space-y-3">
          <Button size="lg" className="w-full" onClick={handleShareImage} disabled={imgBusy}>
            <ImageDown className="h-4 w-4" />
            {imgBusy ? "Gerando imagem…" : "Compartilhar"}
          </Button>

          <p className="text-center text-xs text-muted2">
            📸 Postou? Marque{" "}
            <span className="font-semibold text-gold-300">@cristao.quiz</span> na sua publicação
            que a gente repassa! 💛
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="subtle" onClick={handleShare}>
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              {copied ? "Resumo copiado!" : "Compartilhar em texto"}
            </Button>
            <Button variant="subtle" onClick={onRestart}>
              <RotateCcw className="h-4 w-4" /> Jogar novamente
            </Button>
            <Link href="/">
              <Button variant="ghost">
                <Home className="h-4 w-4" /> Início
              </Button>
            </Link>
          </div>

          <div className="flex justify-center pt-1">
            <InstagramLink />
          </div>
        </div>
      </div>
    </main>
  );
}
