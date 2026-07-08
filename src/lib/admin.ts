import { getSupabase } from "@/lib/supabase";
import type { CityCoord, CityKey } from "@/app/api/geocode/route";

export interface RoomSummary {
  id: string;
  code: string;
  status: string;
  question_count: number;
  created_at: string;
}

export interface PlayerLocation {
  id: string;
  room_id: string;
  city: string | null;
  state: string | null;
  country: string | null;
  created_at: string;
}

/** Agrupamento de jogadores por cidade, já pronto para plotar no mapa. */
export interface CityGroup extends CityKey {
  label: string;
  count: number;
}

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase não configurado.");
  return supabase;
}

export interface DailyStat {
  key: string; // YYYY-MM-DD no fuso de São Paulo
  label: string; // "Hoje", "Ontem" ou "DD/MM"
  rooms: number;
  players: number;
}

const SAO_PAULO_TZ = "America/Sao_Paulo";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Chave do dia (YYYY-MM-DD) de uma data no fuso de São Paulo. */
function saoPauloDayKey(date: Date): string {
  // en-CA formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Resumo dos últimos `days` dias (mais recente primeiro): partidas criadas e
 * jogadores que entraram em partidas criadas naquele dia. Agrupa por dia no fuso
 * de São Paulo. Dias sem nenhuma partida são omitidos.
 */
export async function fetchDailyStats(days = 10): Promise<DailyStat[]> {
  const supabase = requireSupabase();

  // Janela um pouco mais larga que o necessário para cobrir a virada de dia em -03.
  const since = new Date(Date.now() - (days + 1) * DAY_MS).toISOString();

  const { data: roomsData } = await supabase
    .from("rooms")
    .select("id, created_at")
    .gte("created_at", since);
  const rooms = (roomsData as { id: string; created_at: string }[]) ?? [];

  const roomDay = new Map<string, string>(); // room_id -> dia
  const roomsPerDay = new Map<string, number>();
  for (const r of rooms) {
    const key = saoPauloDayKey(new Date(r.created_at));
    roomDay.set(r.id, key);
    roomsPerDay.set(key, (roomsPerDay.get(key) ?? 0) + 1);
  }

  // Jogadores contados pelo dia da sala à qual pertencem (mais preciso que joined_at).
  const playersPerDay = new Map<string, number>();
  const roomIds = rooms.map((r) => r.id);
  if (roomIds.length) {
    const { data: playersData } = await supabase
      .from("players")
      .select("id, room_id")
      .in("room_id", roomIds);
    for (const p of (playersData as { id: string; room_id: string }[]) ?? []) {
      const key = roomDay.get(p.room_id);
      if (key) playersPerDay.set(key, (playersPerDay.get(key) ?? 0) + 1);
    }
  }

  const todayKey = saoPauloDayKey(new Date());
  const yesterdayKey = saoPauloDayKey(new Date(Date.now() - DAY_MS));

  const result: DailyStat[] = [];
  for (let i = 0; i < days; i++) {
    const key = saoPauloDayKey(new Date(Date.now() - i * DAY_MS));
    const roomCount = roomsPerDay.get(key) ?? 0;
    if (roomCount === 0) continue; // omite dias sem nenhuma partida
    let label: string;
    if (key === todayKey) label = "Hoje";
    else if (key === yesterdayKey) label = "Ontem";
    else {
      const [, month, day] = key.split("-");
      label = `${day}/${month}`;
    }
    result.push({
      key,
      label,
      rooms: roomCount,
      players: playersPerDay.get(key) ?? 0,
    });
  }
  return result;
}

/** Salas ordenadas da mais recente para a mais antiga. */
export async function fetchRooms(): Promise<RoomSummary[]> {
  const supabase = requireSupabase();
  const { data } = await supabase
    .from("rooms")
    .select("id, code, status, question_count, created_at")
    .order("created_at", { ascending: false });
  return (data as RoomSummary[]) ?? [];
}

/** Localizações de uma sala específica, ou de todas as salas quado roomId é null. */
export async function fetchLocations(roomId: string | null): Promise<PlayerLocation[]> {
  const supabase = requireSupabase();
  let query = supabase.from("player_locations").select("*");
  if (roomId) query = query.eq("room_id", roomId);
  const { data } = await query;
  return (data as PlayerLocation[]) ?? [];
}

/** Agrupa localizações por cidade/estado/país, somando a contagem de jogadores. */
export function groupByCity(locations: PlayerLocation[]): CityGroup[] {
  const map = new Map<string, CityGroup>();
  for (const loc of locations) {
    if (!loc.city && !loc.state) continue; // sem info de local útil
    const key = `${loc.city ?? ""}|${loc.state ?? ""}|${loc.country ?? ""}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      const label = [loc.city, loc.state].filter(Boolean).join(", ") || loc.country || "Desconhecido";
      map.set(key, {
        city: loc.city,
        state: loc.state,
        country: loc.country,
        label,
        count: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

/** Resolve as coordenadas das cidades via API de geocodificação (com cache no servidor). */
export async function geocodeCities(groups: CityGroup[]): Promise<Map<string, CityCoord>> {
  const cities: CityKey[] = groups.map((g) => ({
    city: g.city,
    state: g.state,
    country: g.country,
  }));
  const res = await fetch("/api/geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cities }),
  });
  if (!res.ok) return new Map();
  const { coords } = (await res.json()) as { coords: CityCoord[] };
  const map = new Map<string, CityCoord>();
  for (const c of coords) {
    map.set(`${c.city ?? ""}|${c.state ?? ""}|${c.country ?? ""}`, c);
  }
  return map;
}
