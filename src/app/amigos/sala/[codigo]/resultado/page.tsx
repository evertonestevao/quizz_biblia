"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { AppHeader } from "@/components/layout/AppHeader";
import { RankingPodium } from "@/components/room/RankingPodium";
import { ResultTable } from "@/components/room/ResultTable";
import { InstagramLink } from "@/components/common/InstagramLink";
import { LoadingState } from "@/components/game/LoadingState";
import { EmptyState } from "@/components/game/EmptyState";
import { Button } from "@/components/ui/button";
import { createRematch, fetchPlayers, fetchRoomByCode } from "@/lib/room";
import type { RematchBroadcast } from "@/lib/room";
import { getSession, saveSession } from "@/lib/storage";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { rankPlayers } from "@/lib/scoring";
import { getVersion } from "@/lib/versions";
import { shareResultImage } from "@/lib/shareImage";
import type { Player, Room } from "@/types/room";
import { Home, ImageDown, RotateCcw } from "lucide-react";

/** Mensagem de colocação para o card compartilhável (destaque no pódio). */
function placementMessage(rank: number, total: number): string {
  if (rank === 1) return "🥇 Campeão!";
  if (rank === 2) return "🥈 2º lugar!";
  if (rank === 3) return "🥉 3º lugar!";
  return `${rank}º lugar de ${total}`;
}

export default function ResultadoPage() {
  const params = useParams<{ codigo: string }>();
  const code = (params.codigo ?? "").toUpperCase();
  const router = useRouter();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "not_found">("loading");
  const [playerId, setPlayerId] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [error, setError] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);

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

  // Realtime Broadcast: escuta o aviso de "nova sala" da revanche e redireciona
  // automaticamente todos os jogadores desta tela para o lobby da sala nova.
  useEffect(() => {
    if (!room?.id) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`rematch:${room.id}`)
      .on("broadcast", { event: "new_room" }, ({ payload }) => {
        const data = payload as RematchBroadcast;
        const session = getSession();
        const newPlayerId = session ? data.mapping[session.playerId] : undefined;
        if (session && newPlayerId) {
          saveSession({
            playerId: newPlayerId,
            playerName: session.playerName,
            roomCode: data.code,
            roomId: data.roomId,
          });
        }
        router.push(`/amigos/sala/${data.code}`);
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [room?.id, router]);

  const ranking = useMemo(() => rankPlayers(players), [players]);
  const isHost = room?.host_player_id != null && room.host_player_id === playerId;

  const meIndex = ranking.findIndex((p) => p.id === playerId);
  const me = meIndex >= 0 ? ranking[meIndex] : null;

  async function handleShareImage() {
    if (!me || !room || imgBusy) return;
    setImgBusy(true);
    try {
      const answered = room.question_count;
      const correct = me.correct_answers;
      await shareResultImage({
        modeLabel: "Em grupo",
        playersCount: ranking.length,
        playerName: me.name,
        score: me.total_score,
        correct,
        answered,
        pct: answered > 0 ? Math.round((correct / answered) * 100) : 0,
        message: placementMessage(meIndex + 1, ranking.length),
        versionLabel: getVersion(room.bible_version).label.split(" — ")[0],
      });
    } catch {
      // Falha ao gerar/compartilhar: ignora silenciosamente.
    } finally {
      setImgBusy(false);
    }
  }

  async function handlePlayAgain() {
    if (!room || !isHost || !playerId) return;
    setCreating(true);
    setError("");
    try {
      const { newRoom, mapping, hostNewPlayerId } = await createRematch(room, players, playerId);
      const session = getSession();
      saveSession({
        playerId: hostNewPlayerId,
        playerName: session?.playerName ?? players.find((p) => p.id === playerId)?.name ?? "",
        roomCode: newRoom.code,
        roomId: newRoom.id,
      });
      // Avisa os demais jogadores (ainda nesta tela) sobre a nova sala.
      await channelRef.current?.send({
        type: "broadcast",
        event: "new_room",
        payload: { roomId: newRoom.id, code: newRoom.code, mapping } as RematchBroadcast,
      });
      router.push(`/amigos/sala/${newRoom.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar a nova sala.");
      setCreating(false);
    }
  }

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

        {error && <p className="text-center text-sm text-red-300">{error}</p>}

        <div className="space-y-3">
          {me && (
            <Button size="lg" className="w-full" onClick={handleShareImage} disabled={imgBusy}>
              <ImageDown className="h-4 w-4" />
              {imgBusy ? "Gerando imagem…" : "Compartilhar imagem"}
            </Button>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            {isHost ? (
              <Button variant="subtle" size="lg" onClick={handlePlayAgain} disabled={creating}>
                <RotateCcw className="h-4 w-4" />
                {creating ? "Criando nova sala..." : "Jogar novamente"}
              </Button>
            ) : (
              <p className="w-full text-center text-sm text-muted2">
                Aguardando o anfitrião iniciar uma nova sala...
              </p>
            )}
            <Link href="/">
              <Button variant="ghost" size="lg">
                <Home className="h-4 w-4" /> Voltar ao início
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
