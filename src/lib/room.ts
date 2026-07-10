import { getSupabase } from "@/lib/supabase";
import { generateQuestions } from "@/lib/bible";
import { loadBooks } from "@/lib/versions";
import { getDeviceId } from "@/lib/storage";
import { generateRoomCode } from "@/lib/utils";
import type {
  Player,
  Room,
  RoomQuestion,
  SubmitAnswerResult,
} from "@/types/room";

/** Duração (segundos) da contagem regressiva "Prepare-se" antes da 1ª pergunta. */
export const COUNTDOWN_SECONDS = 5;

/** Evento de broadcast disparado no canal do lobby quando a contagem começa. */
export const COUNTDOWN_EVENT = "countdown";

export interface CountdownBroadcast {
  countdown_started_at: string;
  countdown_seconds: number;
}

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      "Supabase não configurado. Preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no arquivo .env.local.",
    );
  }
  return supabase;
}

/** Diferença (ms) entre o relógio do servidor e o do navegador. */
export async function getServerTimeOffsetMs(): Promise<number> {
  const supabase = requireSupabase();
  const before = Date.now();
  const { data, error } = await supabase.rpc("get_server_time");
  const after = Date.now();
  if (error || !data) return 0;
  const serverMs = new Date(data as string).getTime();
  const midpoint = (before + after) / 2;
  return serverMs - midpoint;
}

export async function createRoom(params: {
  hostName: string;
  questionDuration: number;
  questionCount: number;
  bibleVersion: string;
}): Promise<{ room: Room; player: Player }> {
  const supabase = requireSupabase();

  let room: Room | null = null;
  // Tenta alguns códigos até achar um livre (colisão é raríssima)
  for (let attempt = 0; attempt < 5 && !room; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        code,
        status: "lobby",
        question_count: params.questionCount,
        question_duration: params.questionDuration,
        current_question_index: 0,
        bible_version: params.bibleVersion,
      })
      .select()
      .single();
    if (!error && data) room = data as Room;
  }
  if (!room) throw new Error("Não foi possível criar a sala. Tente novamente.");

  const { data: playerData, error: playerError } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      name: params.hostName,
      device_id: getDeviceId(),
    })
    .select()
    .single();
  if (playerError || !playerData)
    throw new Error("Não foi possível criar o jogador anfitrião.");
  const player = playerData as Player;

  const { error: hostError } = await supabase
    .from("rooms")
    .update({ host_player_id: player.id })
    .eq("id", room.id);
  if (hostError)
    throw new Error("Não foi possível registrar o anfitrião da sala.");

  return { room: { ...room, host_player_id: player.id }, player };
}

/** Mapa de id de jogador da sala anterior -> id na sala nova. */
export type PlayerIdMap = Record<string, string>;

export interface RematchResult {
  newRoom: Room;
  /** Correlação id antigo -> id novo, para cada cliente adotar seu novo jogador. */
  mapping: PlayerIdMap;
  hostNewPlayerId: string;
}

/** Payload do broadcast que avisa a sala anterior sobre a nova sala criada. */
export interface RematchBroadcast {
  roomId: string;
  code: string;
  mapping: PlayerIdMap;
}

/**
 * Cria uma nova sala (revanche) repetindo as configurações da anterior e migra
 * todos os jogadores para ela com pontuação zerada. O anfitrião também ganha um
 * novo registro de jogador, para o qual a nova sala aponta como host.
 */
export async function createRematch(
  previousRoom: Room,
  players: Player[],
  hostPlayerId: string,
): Promise<RematchResult> {
  const supabase = requireSupabase();

  let newRoom: Room | null = null;
  for (let attempt = 0; attempt < 5 && !newRoom; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        code,
        status: "lobby",
        question_count: previousRoom.question_count,
        question_duration: previousRoom.question_duration,
        current_question_index: 0,
        bible_version: previousRoom.bible_version,
      })
      .select()
      .single();
    if (!error && data) newRoom = data as Room;
  }
  if (!newRoom)
    throw new Error("Não foi possível criar a nova sala. Tente novamente.");

  // Migra os jogadores (pontuação zerada). Insert em paralelo, cada um retornando
  // o próprio id novo, para montar o mapa id antigo -> id novo sem ambiguidade.
  let migrated: { oldId: string; newId: string }[];
  try {
    migrated = await Promise.all(
      players.map(async (p) => {
        const { data, error } = await supabase
          .from("players")
          .insert({
            room_id: newRoom!.id,
            name: p.name,
            device_id: p.device_id ?? null,
          })
          .select()
          .single();
        if (error || !data) throw new Error("player_insert_failed");
        return { oldId: p.id, newId: (data as Player).id };
      }),
    );
  } catch {
    throw new Error(
      "Não foi possível migrar os jogadores para a nova sala. Tente novamente.",
    );
  }

  const mapping: PlayerIdMap = {};
  for (const m of migrated) mapping[m.oldId] = m.newId;

  const hostNewPlayerId = mapping[hostPlayerId];
  if (!hostNewPlayerId)
    throw new Error("Não foi possível migrar o anfitrião para a nova sala.");

  const { error: hostError } = await supabase
    .from("rooms")
    .update({ host_player_id: hostNewPlayerId })
    .eq("id", newRoom.id);
  if (hostError)
    throw new Error("Não foi possível definir o anfitrião da nova sala.");

  return {
    newRoom: { ...newRoom, host_player_id: hostNewPlayerId },
    mapping,
    hostNewPlayerId,
  };
}

export async function fetchRoomByCode(code: string): Promise<Room | null> {
  const supabase = requireSupabase();
  const { data } = await supabase
    .from("rooms")
    .select()
    .eq("code", code.toUpperCase())
    .maybeSingle();
  return (data as Room) ?? null;
}

export async function joinRoom(
  code: string,
  name: string,
): Promise<{ room: Room; player: Player }> {
  const supabase = requireSupabase();
  const room = await fetchRoomByCode(code);
  if (!room) throw new Error("Sala não encontrada. Confira o código.");
  if (room.status !== "lobby")
    throw new Error("Esta sala já iniciou a partida.");

  const { data, error } = await supabase
    .from("players")
    .insert({ room_id: room.id, name, device_id: getDeviceId() })
    .select()
    .single();
  if (error || !data) throw new Error("Não foi possível entrar na sala.");
  return { room, player: data as Player };
}

/**
 * Promove um jogador a anfitrião, mas só se o host atual ainda for
 * `expectedOldHostId` — a condição no `host_player_id` torna a troca atômica:
 * mesmo que vários clientes tentem ao mesmo tempo, só um vence a corrida.
 * Retorna true se este cliente efetivou a troca.
 */
export async function claimHost(
  roomId: string,
  newHostId: string,
  expectedOldHostId: string | null,
): Promise<boolean> {
  const supabase = requireSupabase();
  let query = supabase.from("rooms").update({ host_player_id: newHostId }).eq("id", roomId);
  query = expectedOldHostId
    ? query.eq("host_player_id", expectedOldHostId)
    : query.is("host_player_id", null);
  const { data, error } = await query.select("id");
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

/**
 * Marca a sala como encerrada quando ela esvaziou. Só age em salas ainda no
 * lobby (não interfere numa partida em andamento nem na navegação lobby→jogo,
 * onde o status já é "countdown"/"playing"). Best-effort: falhas são ignoradas.
 */
export async function markRoomAbandoned(roomId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase
      .from("rooms")
      .update({ status: "finished" })
      .eq("id", roomId)
      .eq("status", "lobby");
  } catch {
    // best-effort: nada a fazer se falhar
  }
}

/**
 * Registra (fire-and-forget) a localização aproximada do jogador via geo-IP no servidor.
 * Não bloqueia nem atrasa o fluxo de entrada; falhas são ignoradas.
 */
export function trackPlayerLocation(roomId: string): void {
  try {
    void fetch("/api/track-location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignora silenciosamente
  }
}

export async function fetchPlayers(roomId: string): Promise<Player[]> {
  const supabase = requireSupabase();
  const { data } = await supabase
    .from("players")
    .select()
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });
  return (data as Player[]) ?? [];
}

export async function fetchRoomById(roomId: string): Promise<Room | null> {
  const supabase = requireSupabase();
  const { data } = await supabase
    .from("rooms")
    .select()
    .eq("id", roomId)
    .maybeSingle();
  return (data as Room) ?? null;
}

export async function fetchQuestion(
  roomId: string,
  questionIndex: number,
): Promise<RoomQuestion | null> {
  const supabase = requireSupabase();
  const { data } = await supabase
    .from("room_questions")
    .select()
    .eq("room_id", roomId)
    .eq("question_index", questionIndex)
    .maybeSingle();
  return (data as RoomQuestion) ?? null;
}

/**
 * Host: gera as perguntas, grava no banco e dispara a contagem regressiva
 * ("Prepare-se"). A sala passa para o estado "countdown"; a 1ª pergunta só é
 * ativada ao fim do contador, via {@link beginFirstQuestion}. Retorna o instante
 * de início da contagem (para sincronizar todos os clientes).
 */
export async function startGame(room: Room): Promise<string> {
  const supabase = requireSupabase();

  const { count } = await supabase
    .from("room_questions")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id);

  if (!count) {
    const books = await loadBooks(room.bible_version);
    const questions = generateQuestions(books, room.question_count);
    const rows = questions.map((q, index) => ({
      room_id: room.id,
      question_index: index,
      verse_text: q.verseText,
      correct_reference: q.correctReference,
      options: q.options,
      duration_seconds: room.question_duration,
      status: "waiting",
    }));
    const { error } = await supabase.from("room_questions").insert(rows);
    if (error) throw new Error("Não foi possível gerar as perguntas da sala.");
  }

  const { data, error } = await supabase.rpc("start_countdown", {
    p_room_id: room.id,
  });
  if (error || !data) throw new Error("Não foi possível iniciar a partida.");
  return data as string;
}

/**
 * Encerra a contagem regressiva e ativa a 1ª pergunta. Idempotente no servidor
 * (guardado pelo status "countdown"), então pode ser chamado sem risco de
 * reiniciar o started_at caso já tenha sido disparado.
 */
export async function beginFirstQuestion(roomId: string): Promise<void> {
  const supabase = requireSupabase();
  await supabase.rpc("activate_first_question", { p_room_id: roomId });
}

/** Host: encerra a pergunta atual e avança (ou finaliza a sala). */
export async function advanceQuestion(roomId: string): Promise<void> {
  const supabase = requireSupabase();
  await supabase.rpc("next_question", { p_room_id: roomId });
}

/** Envia resposta. A validação de tempo, duplicidade e pontuação é feita no servidor. */
export async function submitAnswer(params: {
  questionId: string;
  playerId: string;
  selectedReference: string;
}): Promise<SubmitAnswerResult> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("submit_answer", {
    p_question_id: params.questionId,
    p_player_id: params.playerId,
    p_selected: params.selectedReference,
  });
  if (error) throw new Error("Não foi possível enviar a resposta.");
  return data as SubmitAnswerResult;
}
