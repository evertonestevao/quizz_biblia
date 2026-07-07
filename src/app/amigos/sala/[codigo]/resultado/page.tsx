"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { RankingPodium } from "@/components/room/RankingPodium";
import { ResultTable } from "@/components/room/ResultTable";
import { LoadingState } from "@/components/game/LoadingState";
import { EmptyState } from "@/components/game/EmptyState";
import { Button } from "@/components/ui/button";
import { fetchPlayers, fetchRoomByCode } from "@/lib/room";
import { getSession } from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase";
import { rankPlayers } from "@/lib/scoring";
import type { Player, Room } from "@/types/room";
import { Home, RotateCcw } from "lucide-react";

export default function ResultadoPage() {
  const params = useParams<{ codigo: string }>();
  const code = (params.codigo ?? "").toUpperCase();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "not_found">("loading");
  const [playerId, setPlayerId] = useState<string | undefined>();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus("not_found");
      return;
    }
    const session = getSession();
    if (session?.roomCode === code) setPlayerId(session.playerId);
    (async () => {
      const found = await fetchRoomByCode(code);
      if (!found) {
        setStatus("not_found");
        return;
      }
      setRoom(found);
      setPlayers(await fetchPlayers(found.id));
      setStatus("ready");
    })();
  }, [code]);

  const ranking = useMemo(() => rankPlayers(players), [players]);

  if (status === "loading") {
    return (
      <main className="min-h-dvh">
        <AppHeader />
        <LoadingState message="Calculando o resultado final..." />
      </main>
    );
  }

  if (status === "not_found" || !room) {
    return (
      <main className="min-h-dvh">
        <AppHeader />
        <div className="px-5 py-10">
          <EmptyState
            title="Resultado indisponível"
            description="Não foi possível carregar o resultado desta sala."
            actionHref="/"
            actionLabel="Voltar ao início"
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh pb-12">
      <AppHeader />
      <div className="mx-auto max-w-2xl space-y-8 px-5">
        <div className="animate-fadeUp text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted2">
            Sala {room.code} · Fim da rodada
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            <span className="gold-text">Resultado final</span>
          </h1>
        </div>

        <RankingPodium topThree={ranking.slice(0, 3)} />

        <ResultTable players={ranking} currentPlayerId={playerId} />

        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/amigos/criar">
            <Button size="lg">
              <RotateCcw className="h-4 w-4" /> Jogar novamente
            </Button>
          </Link>
          <Link href="/">
            <Button variant="subtle" size="lg">
              <Home className="h-4 w-4" /> Voltar ao início
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
