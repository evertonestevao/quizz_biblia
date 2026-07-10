"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayerNameForm } from "@/components/room/PlayerNameForm";
import { PlayerList } from "@/components/room/PlayerList";
import { ShareWhatsAppButton } from "@/components/room/ShareWhatsAppButton";
import { LoadingState } from "@/components/game/LoadingState";
import { EmptyState } from "@/components/game/EmptyState";
import {
  COUNTDOWN_EVENT,
  COUNTDOWN_SECONDS,
  fetchPlayers,
  fetchRoomByCode,
  joinRoom,
  startGame,
  trackPlayerLocation,
  type CountdownBroadcast,
} from "@/lib/room";
import { getSession, saveSession } from "@/lib/storage";
import { usePlayingPresence } from "@/hooks/usePlayingPresence";
import { useRoomHost } from "@/hooks/useRoomHost";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Player, Room } from "@/types/room";
import { getVersion } from "@/lib/versions";
import { Check, Copy, Play, Timer, ListOrdered } from "lucide-react";

export default function RoomLobbyPage() {
  const params = useParams<{ codigo: string }>();
  const code = (params.codigo ?? "").toUpperCase();
  const router = useRouter();

  usePlayingPresence();

  // URL da sala para compartilhar (client-side, evita mismatch de hidratação).
  useEffect(() => {
    setRoomUrl(window.location.href);
  }, []);

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "join" | "lobby" | "not_found" | "no_supabase">(
    "loading"
  );
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [roomUrl, setRoomUrl] = useState("");
  const roomRef = useRef<Room | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const refresh = useCallback(async () => {
    const current = roomRef.current;
    if (!current) return;
    const [freshRoom, freshPlayers] = await Promise.all([
      fetchRoomByCode(current.code),
      fetchPlayers(current.id),
    ]);
    if (freshRoom) {
      roomRef.current = freshRoom;
      setRoom(freshRoom);
      if (freshRoom.status === "countdown" || freshRoom.status === "playing") {
        router.push(`/amigos/sala/${freshRoom.code}/jogar`);
      } else if (freshRoom.status === "finished") {
        router.push(`/amigos/sala/${freshRoom.code}/resultado`);
      }
    }
    setPlayers(freshPlayers);
  }, [router]);

  // Transferência automática de anfitrião se o host cair (via presence).
  const { becameHost } = useRoomHost({
    roomId: room?.id ?? null,
    playerId,
    hostPlayerId: room?.host_player_id ?? null,
    players,
    roomStatus: room?.status ?? null,
    active: status === "lobby",
    onHostChanged: () => refresh(),
  });

  // Carga inicial
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus("no_supabase");
      return;
    }
    let cancelled = false;
    (async () => {
      const found = await fetchRoomByCode(code);
      if (cancelled) return;
      if (!found) {
        setStatus("not_found");
        return;
      }
      roomRef.current = found;
      setRoom(found);
      setPlayers(await fetchPlayers(found.id));

      const session = getSession();
      if (session && session.roomCode === code) {
        setPlayerId(session.playerId);
        setStatus("lobby");
      } else {
        setStatus("join");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  // Realtime + polling de reserva
  useEffect(() => {
    if (status !== "lobby" && status !== "join") return;
    const supabase = getSupabase();
    const current = roomRef.current;
    if (!supabase || !current) return;

    const channel = supabase
      .channel(`lobby:${current.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${current.id}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${current.id}` },
        () => refresh()
      )
      // Aviso imediato de que a contagem regressiva começou (redundante com o
      // status "countdown" persistido na sala, que cobre refresh/reconexão).
      .on("broadcast", { event: COUNTDOWN_EVENT }, () => refresh())
      .subscribe();
    channelRef.current = channel;

    const interval = setInterval(refresh, 3000);
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [status, refresh]);

  async function handleJoin(name: string) {
    setJoining(true);
    setError("");
    try {
      const { room: joinedRoom, player } = await joinRoom(code, name);
      trackPlayerLocation(joinedRoom.id);
      saveSession({
        playerId: player.id,
        playerName: player.name,
        roomCode: joinedRoom.code,
        roomId: joinedRoom.id,
      });
      setPlayerId(player.id);
      setStatus("lobby");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar na sala.");
    } finally {
      setJoining(false);
    }
  }

  async function handleStart() {
    if (!room) return;
    setStarting(true);
    setError("");
    try {
      const countdownStartedAt = await startGame(room);
      // Avisa todos os jogadores (via broadcast) que a contagem começou, enviando
      // o instante de início para que todos sincronizem o contador pelo mesmo
      // relógio. Quem entrar/atualizar depois lê o mesmo valor da sala.
      const payload: CountdownBroadcast = {
        countdown_started_at: countdownStartedAt,
        countdown_seconds: COUNTDOWN_SECONDS,
      };
      channelRef.current?.send({ type: "broadcast", event: COUNTDOWN_EVENT, payload });
      router.push(`/amigos/sala/${room.code}/jogar`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar a partida.");
      setStarting(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível: ignora silenciosamente
    }
  }

  if (status === "loading") {
    return (
      <main className="min-h-dvh">
        <AppHeader />
        <LoadingState message="Procurando a sala..." />
      </main>
    );
  }

  if (status === "no_supabase") {
    return (
      <main className="min-h-dvh">
        <AppHeader />
        <div className="px-5 py-10">
          <EmptyState
            title="Supabase não configurado"
            description="O modo entre amigos precisa do Supabase. Preencha o arquivo .env.local com as variáveis do seu projeto e reinicie o servidor. Enquanto isso, o Modo Solo funciona normalmente."
            actionHref="/solo"
            actionLabel="Jogar Modo Solo"
          />
        </div>
      </main>
    );
  }

  if (status === "not_found" || !room) {
    return (
      <main className="min-h-dvh">
        <AppHeader />
        <div className="px-5 py-10">
          <EmptyState
            title="Sala não encontrada"
            description={`Não encontramos nenhuma sala com o código ${code}. Confira o código com quem criou a sala ou crie uma nova.`}
            actionHref="/amigos"
            actionLabel="Voltar"
          />
        </div>
      </main>
    );
  }

  if (status === "join") {
    return (
      <main className="min-h-dvh">
        <AppHeader />
        <div className="mx-auto max-w-md px-5 py-10">
          <Card className="animate-fadeUp space-y-5 p-7">
            <div>
              <CardTitle className="text-2xl">
                Entrar na sala <span className="gold-text">{room.code}</span>
              </CardTitle>
              <CardDescription className="mt-1.5">
                {room.question_count} perguntas · {room.question_duration}s por pergunta ·{" "}
                {getVersion(room.bible_version).label.split(" — ")[0]}
              </CardDescription>
            </div>
            <PlayerNameForm buttonLabel="Entrar na sala" loading={joining} onSubmit={handleJoin} />
            {error && <p className="text-sm text-red-300">{error}</p>}
          </Card>
        </div>
      </main>
    );
  }

  const isHost = playerId !== null && playerId === room.host_player_id;

  return (
    <main className="min-h-dvh pb-12">
      <AppHeader />
      <div className="mx-auto max-w-md space-y-5 px-5">
        {becameHost && (
          <div className="animate-fadeUp rounded-xl border border-gold-500/40 bg-gold-500/10 px-4 py-3 text-center text-sm font-semibold text-gold-200">
            👑 O anfitrião saiu — agora você é o anfitrião da sala!
          </div>
        )}
        <Card className="animate-fadeUp space-y-5 p-7 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted2">
            Código da sala
          </p>
          <p className="font-display text-5xl font-bold tracking-[0.25em] gold-text">
            {room.code}
          </p>
          <div className="space-y-2">
            <Button variant="subtle" className="w-full" onClick={copyLink}>
              {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              {copied ? "Link copiado!" : "Copiar link de convite"}
            </Button>
            <ShareWhatsAppButton roomCode={room.code} roomUrl={roomUrl} />
          </div>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted2">
            <span className="inline-flex items-center gap-1.5">
              <Timer className="h-4 w-4 text-gold-400" /> {room.question_duration}s por pergunta
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ListOrdered className="h-4 w-4 text-gold-400" /> {room.question_count} perguntas
            </span>
          </div>
          <span className="inline-flex items-center rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gold-300">
            {getVersion(room.bible_version).label}
          </span>
        </Card>

        <div className="animate-fadeUp space-y-3" style={{ animationDelay: "100ms" }}>
          <h2 className="px-1 text-sm font-semibold uppercase tracking-widest text-muted2">
            Jogadores conectados ({players.length})
          </h2>
          <PlayerList
            players={players}
            hostPlayerId={room.host_player_id}
            currentPlayerId={playerId ?? undefined}
          />
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        {isHost ? (
          <Button className="w-full" size="lg" onClick={handleStart} disabled={starting}>
            <Play className="h-5 w-5" />
            {starting ? "Preparando perguntas..." : "Iniciar partida"}
          </Button>
        ) : (
          <p className="text-center text-sm text-muted2">
            Aguardando o anfitrião iniciar a partida...
          </p>
        )}
      </div>
    </main>
  );
}
