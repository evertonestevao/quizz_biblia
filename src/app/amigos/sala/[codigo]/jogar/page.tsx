"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { QuestionCard } from "@/components/game/QuestionCard";
import { AnswerOption } from "@/components/game/AnswerOption";
import { TimerBar } from "@/components/game/TimerBar";
import { LoadingState } from "@/components/game/LoadingState";
import { EmptyState } from "@/components/game/EmptyState";
import { CountdownScreen } from "@/components/game/CountdownScreen";
import {
  advanceQuestion,
  beginFirstQuestion,
  COUNTDOWN_SECONDS,
  fetchPlayers,
  fetchQuestion,
  fetchRoomByCode,
  getServerTimeOffsetMs,
  submitAnswer,
} from "@/lib/room";
import { getSession } from "@/lib/storage";
import { usePlayingPresence } from "@/hooks/usePlayingPresence";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { rankPlayers } from "@/lib/scoring";
import type {
  Player,
  Room,
  RoomQuestion,
  SubmitAnswerResult,
} from "@/types/room";
import { Trophy } from "lucide-react";

const REVEAL_DELAY_MS = 3000; // tempo mostrando a resposta antes de avançar

export default function MultiplayerGamePage() {
  const params = useParams<{ codigo: string }>();
  const code = (params.codigo ?? "").toUpperCase();
  const router = useRouter();

  usePlayingPresence();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [question, setQuestion] = useState<RoomQuestion | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitAnswerResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [countdownLeft, setCountdownLeft] = useState(COUNTDOWN_SECONDS);

  const playerIdRef = useRef<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const questionRef = useRef<RoomQuestion | null>(null);
  const offsetRef = useRef(0);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advancedForRef = useRef<string | null>(null);
  const countdownBegunRef = useRef<string | null>(null);

  const isHost =
    room?.host_player_id != null && room.host_player_id === playerIdRef.current;
  const deadlineShortened = Boolean(
    question?.ends_at &&
    question.started_at &&
    new Date(question.ends_at).getTime() <
      new Date(question.started_at).getTime() +
        question.duration_seconds * 1000 -
        500,
  );
  const timeOver = secondsLeft <= 0 && question?.status === "active";
  const revealed =
    Boolean(result) || timeOver || question?.status === "finished";
  const answered = Boolean(selected);

  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);

  const computeEndsAtMs = useCallback(
    (q: RoomQuestion | null): number | null => {
      if (!q || !q.started_at || q.status !== "active") return null;
      // Fonte da verdade é ends_at (pode ser encurtado pelo servidor quando
      // todos respondem). started_at + duração é apenas fallback.
      if (q.ends_at) return new Date(q.ends_at).getTime();
      return new Date(q.started_at).getTime() + q.duration_seconds * 1000;
    },
    [],
  );

  const computeSecondsLeft = useCallback(
    (q: RoomQuestion | null): number => {
      const endsAt = computeEndsAtMs(q);
      if (endsAt === null) return 0;
      return Math.ceil((endsAt - (Date.now() + offsetRef.current)) / 1000);
    },
    [computeEndsAtMs],
  );

  const loadCurrentQuestion = useCallback(async (freshRoom: Room) => {
    const q = await fetchQuestion(
      freshRoom.id,
      freshRoom.current_question_index,
    );
    const previous = questionRef.current;
    questionRef.current = q;
    setQuestion(q);
    if (q && previous?.id !== q.id) {
      // Nova pergunta: limpa estado local
      setSelected(null);
      setResult(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    const freshRoom = await fetchRoomByCode(code);
    if (!freshRoom) {
      setNotFound(true);
      return;
    }
    roomRef.current = freshRoom;
    setRoom(freshRoom);
    if (freshRoom.status === "finished") {
      router.push(`/amigos/sala/${freshRoom.code}/resultado`);
      return;
    }
    if (freshRoom.status === "lobby") {
      router.push(`/amigos/sala/${freshRoom.code}`);
      return;
    }
    const [freshPlayers] = await Promise.all([
      fetchPlayers(freshRoom.id),
      loadCurrentQuestion(freshRoom),
    ]);
    setPlayers(freshPlayers);
  }, [code, router, loadCurrentQuestion]);

  // Bootstrap
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setNotFound(true);
      return;
    }
    const session = getSession();
    if (!session || session.roomCode !== code) {
      router.push(`/amigos/sala/${code}`);
      return;
    }
    playerIdRef.current = session.playerId;
    (async () => {
      offsetRef.current = await getServerTimeOffsetMs();
      await refresh();
    })();
  }, [code, router, refresh]);

  // Realtime + polling de reserva
  useEffect(() => {
    const supabase = getSupabase();
    const current = roomRef.current;
    if (!supabase || !current) return;

    const channel = supabase
      .channel(`game:${current.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${current.id}`,
        },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room_questions",
          filter: `room_id=eq.${current.id}`,
        },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${current.id}`,
        },
        () => refresh(),
      )
      .subscribe();

    const interval = setInterval(refresh, 2500);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id]);

  // Timer local sincronizado com started_at do servidor
  useEffect(() => {
    const tick = () => setSecondsLeft(computeSecondsLeft(questionRef.current));
    tick();
    const interval = setInterval(tick, 300);
    return () => clearInterval(interval);
  }, [question?.id, question?.status, computeSecondsLeft]);

  // Contagem regressiva "Prepare-se": todos os clientes calculam o número
  // exibido a partir de countdown_started_at (do servidor), então terminam
  // próximo ao mesmo instante real, independente da latência de cada um.
  // Ao zerar, o host ativa a 1ª pergunta (reusa o fluxo normal de start).
  useEffect(() => {
    if (room?.status !== "countdown" || !room.countdown_started_at) return;
    const endsAt =
      new Date(room.countdown_started_at).getTime() + COUNTDOWN_SECONDS * 1000;
    const tick = () => {
      const left = Math.ceil((endsAt - serverNow()) / 1000);
      setCountdownLeft(Math.max(0, left));
      if (left <= 0 && isHost && countdownBegunRef.current !== room.id) {
        countdownBegunRef.current = room.id;
        beginFirstQuestion(room.id);
      }
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [room?.status, room?.countdown_started_at, room?.id, isHost, serverNow]);

  // Host: agenda o avanço automático no fim do prazo. Reexecuta quando
  // ends_at muda (encurtado pelo servidor quando todos respondem).
  useEffect(() => {
    if (
      !isHost ||
      !question ||
      question.status !== "active" ||
      !question.started_at
    )
      return;
    if (advancedForRef.current === question.id) return;

    const endsAt = computeEndsAtMs(question);
    if (endsAt === null) return;

    const naturalEnd =
      new Date(question.started_at).getTime() +
      question.duration_seconds * 1000;
    const wasShortened = endsAt < naturalEnd - 500;
    // Prazo normal: ninguém respondeu tudo -> mostra a resposta por 3s após zerar.
    // Prazo encurtado: os 3s de contagem já são o reveal -> avança logo em seguida.
    const revealMs = wasShortened ? 400 : REVEAL_DELAY_MS;
    const delay = Math.max(0, endsAt - serverNow()) + revealMs;

    advanceTimeoutRef.current = setTimeout(() => {
      triggerAdvance(question.id);
    }, delay);

    return () => {
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, question?.id, question?.status, question?.ends_at]);

  function triggerAdvance(questionId: string) {
    if (advancedForRef.current === questionId) return;
    advancedForRef.current = questionId;
    const current = roomRef.current;
    if (current) advanceQuestion(current.id);
  }

  async function handleSelect(reference: string) {
    const q = questionRef.current;
    const playerId = playerIdRef.current;
    if (!q || !playerId || selected || computeSecondsLeft(q) <= 0) return;
    setSelected(reference);
    try {
      const response = await submitAnswer({
        questionId: q.id,
        playerId,
        selectedReference: reference,
      });
      if (!response.accepted && response.reason === "time_over") {
        setSelected(null);
      }
      setResult(response);
    } catch {
      setSelected(null);
    }
  }

  const ranking = useMemo(() => rankPlayers(players), [players]);

  if (notFound) {
    return (
      <main className="min-h-dvh">
        <AppHeader />
        <div className="px-5 py-10">
          <EmptyState
            title="Partida indisponível"
            description="Não foi possível carregar esta partida. Verifique o código da sala e a configuração do Supabase."
            actionHref="/amigos"
            actionLabel="Voltar"
          />
        </div>
      </main>
    );
  }

  if (room?.status === "countdown") {
    return (
      <main className="min-h-dvh">
        <AppHeader />
        <CountdownScreen secondsLeft={countdownLeft} />
      </main>
    );
  }

  if (!room || !question) {
    return (
      <main className="min-h-dvh">
        <AppHeader />
        <LoadingState message="Sincronizando a partida..." />
      </main>
    );
  }

  const options = (question.options as unknown as string[]) ?? [];

  return (
    <main className="min-h-dvh pb-12">
      <AppHeader />
      <div className="mx-auto max-w-2xl space-y-5 px-5">
        <div className="flex items-center justify-between text-sm text-muted2">
          <span>
            Sala{" "}
            <span className="font-semibold text-gold-300">{room.code}</span>
          </span>
          <span>
            Pergunta{" "}
            <span className="font-semibold text-parchment">
              {room.current_question_index + 1}
            </span>{" "}
            de {room.question_count}
          </span>
        </div>

        <div className="sticky top-0 z-20 -mx-5 px-5 py-2 backdrop-blur-md">
          <TimerBar
            secondsLeft={secondsLeft}
            totalSeconds={question.duration_seconds}
          />
        </div>

        <QuestionCard
          verseText={question.verse_text}
          eyebrow={`Pergunta ${room.current_question_index + 1}`}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((option, index) => (
            <AnswerOption
              key={option}
              reference={option}
              index={index}
              disabled={answered || revealed}
              revealed={revealed}
              isCorrect={option === question.correct_reference}
              isSelected={option === selected}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {result?.accepted && (
          <div className="glass animate-popIn p-4 text-center">
            <p
              className={`font-display text-lg font-bold ${
                result.is_correct ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {result.is_correct
                ? `Resposta correta! +${result.score} pontos`
                : "Resposta errada. 0 pontos."}
            </p>
            {!revealed && (
              <p className="mt-1 text-sm text-muted2">
                {deadlineShortened
                  ? "Todos responderam! Próxima pergunta em instantes..."
                  : "Aguardando os outros jogadores..."}
              </p>
            )}
          </div>
        )}

        {revealed && (
          <p className="text-center text-sm text-muted2">
            Resposta correta:{" "}
            <span className="font-semibold text-gold-300">
              {question.correct_reference}
            </span>
            {" · "}Próxima pergunta em instantes...
          </p>
        )}

        <div className="space-y-2">
          <h2 className="flex items-center gap-2 px-1 text-sm font-semibold uppercase tracking-widest text-muted2">
            <Trophy className="h-4 w-4 text-gold-400" /> Placar
          </h2>
          <ul className="glass divide-y divide-white/5 p-0">
            {ranking.map((player, index) => (
              <li
                key={player.id}
                className="flex items-center gap-3 px-4 py-2.5 text-sm"
              >
                <span className="w-7 font-display font-bold text-gold-300">
                  {index + 1}º
                </span>
                <span className="flex-1 truncate text-parchment">
                  {player.name}
                  {player.id === playerIdRef.current && (
                    <span className="ml-2 text-xs text-gold-400">(você)</span>
                  )}
                </span>
                <span className="font-semibold text-parchment">
                  {player.total_score} pts
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
