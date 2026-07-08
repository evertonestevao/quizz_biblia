"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { QuestionCard } from "@/components/game/QuestionCard";
import { AnswerOption } from "@/components/game/AnswerOption";
import { ScoreBoard } from "@/components/game/ScoreBoard";
import { LoadingState } from "@/components/game/LoadingState";
import { Button } from "@/components/ui/button";
import { generateQuestion } from "@/lib/bible";
import { applySoloAnswer, INITIAL_SOLO_STATS } from "@/lib/game";
import { getSoloName, getSoloVersion } from "@/lib/storage";
import { getVersion, loadBooks } from "@/lib/versions";
import { formatAccuracy } from "@/lib/utils";
import type { Book } from "@/types/bible";
import type { Question, SoloStats } from "@/types/game";
import { ArrowRight, Home, RotateCcw } from "lucide-react";

export default function SoloGamePage() {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [versionLabel, setVersionLabel] = useState("");
  const [question, setQuestion] = useState<Question | null>(null);
  const [stats, setStats] = useState<SoloStats>(INITIAL_SOLO_STATS);
  const [selected, setSelected] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    setPlayerName(getSoloName() || "Jogador");
    const versionId = getSoloVersion();
    setVersionLabel(getVersion(versionId).label.split(" — ")[0]);
    loadBooks(versionId).then((loaded) => {
      setBooks(loaded);
      setQuestion(generateQuestion(loaded));
    });
  }, []);

  const revealed = selected !== null;
  const isCorrect = revealed && selected === question?.correctReference;

  const boardStats = useMemo(
    () => [
      { label: "Perguntas", value: stats.answered },
      { label: "Acertos", value: stats.correct },
      {
        label: "Acertos %",
        value: formatAccuracy(stats.correct, stats.answered),
      },
    ],
    [stats],
  );

  function handleSelect(reference: string) {
    if (revealed || !question) return;
    setSelected(reference);
    setStats((prev) =>
      applySoloAnswer(prev, reference === question.correctReference),
    );
  }

  function nextQuestion() {
    if (!books) return;
    setSelected(null);
    setQuestion(generateQuestion(books));
  }

  function restart() {
    if (!books) return;
    setStats(INITIAL_SOLO_STATS);
    setSelected(null);
    setQuestion(generateQuestion(books));
  }

  if (!question) {
    return (
      <main className="min-h-dvh">
        <AppHeader />
        <LoadingState message="Preparando o primeiro versículo..." />
      </main>
    );
  }

  return (
    <main className="min-h-dvh pb-12">
      <AppHeader />
      <div className="mx-auto max-w-2xl space-y-5 px-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted2">
            Jogando como{" "}
            <span className="font-semibold text-gold-300">{playerName}</span>
            {versionLabel && (
              <span className="ml-2 text-xs text-muted2">· {versionLabel}</span>
            )}
          </p>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <Home className="h-4 w-4" /> Início
            </Button>
          </Link>
        </div>

        <ScoreBoard stats={boardStats} />

        <QuestionCard
          verseText={question.verseText}
          eyebrow={`Pergunta ${stats.answered + (revealed ? 0 : 1)}`}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          {question.options.map((option, index) => (
            <AnswerOption
              key={option}
              reference={option}
              index={index}
              disabled={revealed}
              revealed={revealed}
              isCorrect={option === question.correctReference}
              isSelected={option === selected}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {revealed && (
          <div className="glass animate-popIn space-y-4 p-5 text-center">
            <p
              className={`font-display text-xl font-bold ${
                isCorrect ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {isCorrect ? "Você acertou!" : "Não foi dessa vez."}
            </p>
            <p className="text-sm text-muted2">
              Resposta correta:{" "}
              <span className="font-semibold text-gold-300">
                {question.correctReference}
              </span>
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={nextQuestion} size="lg">
                Próxima pergunta <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="subtle" onClick={restart}>
                <RotateCcw className="h-4 w-4" /> Reiniciar
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
