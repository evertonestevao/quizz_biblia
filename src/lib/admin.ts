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

/** Uma linha por dia para o gráfico de tendência (cronológico: antigo → recente). */
export interface DailyAudience {
  key: string; // YYYY-MM-DD (fuso de São Paulo)
  label: string; // "Hoje", "Ontem" ou "DD/MM"
  uniqueDevices: number;
  soloSessions: number;
  multiplayerSessions: number;
}

/** Indicadores de audiência agregados (janela de 30 dias) para a visão de negócio. */
export interface AudienceKpis {
  uniqueToday: number;
  unique7d: number;
  unique30d: number;
  sessions30d: number;
  solo30d: number;
  multiplayer30d: number;
  /** Dispositivos cuja 1ª atividade (na janela puxada) caiu nos últimos 30 dias. */
  newDevices30d: number;
  /** Dispositivos com 2+ sessões nos últimos 30 dias (recorrência). */
  returning30d: number;
  sessionsPerDevice30d: number;
  soloSharePct: number;
}

export interface AudienceReport {
  daily: DailyAudience[];
  kpis: AudienceKpis;
}

interface AudienceEvent {
  device: string | null;
  day: string;
  ts: number;
  solo: boolean;
}

/**
 * Relatório de audiência combinando salas (`players`) e jogo solo
 * (`solo_sessions`), unificados pelo `device_id`. Métricas de dispositivos
 * únicos usam apenas registros com `device_id` (os antigos, sem ele, ainda
 * contam como sessão). Todo o agrupamento por dia é no fuso de São Paulo.
 */
export async function fetchAudienceReport(days = 14): Promise<AudienceReport> {
  const supabase = requireSupabase();

  // Janela ampla o suficiente para cobrir os 30 dias dos KPIs.
  const windowDays = Math.max(days, 30) + 1;
  const since = new Date(Date.now() - windowDays * DAY_MS).toISOString();

  const [playersRes, soloRes] = await Promise.all([
    supabase.from("players").select("device_id, joined_at").gte("joined_at", since),
    supabase.from("solo_sessions").select("device_id, created_at").gte("created_at", since),
  ]);

  const events: AudienceEvent[] = [];
  for (const p of (playersRes.data as { device_id: string | null; joined_at: string }[]) ?? []) {
    const d = new Date(p.joined_at);
    events.push({ device: p.device_id, day: saoPauloDayKey(d), ts: d.getTime(), solo: false });
  }
  for (const s of (soloRes.data as { device_id: string | null; created_at: string }[]) ?? []) {
    const d = new Date(s.created_at);
    events.push({ device: s.device_id, day: saoPauloDayKey(d), ts: d.getTime(), solo: true });
  }

  const dayKeyFor = (i: number) => saoPauloDayKey(new Date(Date.now() - i * DAY_MS));
  const windowKeys = (n: number) => {
    const set = new Set<string>();
    for (let i = 0; i < n; i++) set.add(dayKeyFor(i));
    return set;
  };
  const uniqueIn = (keys: Set<string>) => {
    const s = new Set<string>();
    for (const e of events) if (e.device && keys.has(e.day)) s.add(e.device);
    return s.size;
  };

  const todaySet = windowKeys(1);
  const week = windowKeys(7);
  const month = windowKeys(30);

  // Primeira aparição de cada dispositivo (aproximada à janela puxada).
  const firstSeen = new Map<string, number>();
  for (const e of events) {
    if (!e.device) continue;
    const prev = firstSeen.get(e.device);
    if (prev === undefined || e.ts < prev) firstSeen.set(e.device, e.ts);
  }
  const monthStartTs = Date.now() - 30 * DAY_MS;

  let solo30d = 0;
  let multi30d = 0;
  const sessionsByDevice30 = new Map<string, number>();
  for (const e of events) {
    if (!month.has(e.day)) continue;
    if (e.solo) solo30d++;
    else multi30d++;
    if (e.device) sessionsByDevice30.set(e.device, (sessionsByDevice30.get(e.device) ?? 0) + 1);
  }
  const sessions30d = solo30d + multi30d;
  const unique30d = sessionsByDevice30.size;

  let newDevices30d = 0;
  let returning30d = 0;
  sessionsByDevice30.forEach((count, dev) => {
    const fs = firstSeen.get(dev);
    if (fs !== undefined && fs >= monthStartTs) newDevices30d++;
    if (count >= 2) returning30d++;
  });

  const kpis: AudienceKpis = {
    uniqueToday: uniqueIn(todaySet),
    unique7d: uniqueIn(week),
    unique30d,
    sessions30d,
    solo30d,
    multiplayer30d: multi30d,
    newDevices30d,
    returning30d,
    sessionsPerDevice30d: unique30d ? sessions30d / unique30d : 0,
    soloSharePct: sessions30d ? (solo30d / sessions30d) * 100 : 0,
  };

  const todayKey = dayKeyFor(0);
  const yesterdayKey = dayKeyFor(1);
  const perDay = new Map<string, { solo: number; multi: number; devices: Set<string> }>();
  for (const e of events) {
    let bucket = perDay.get(e.day);
    if (!bucket) {
      bucket = { solo: 0, multi: 0, devices: new Set() };
      perDay.set(e.day, bucket);
    }
    if (e.solo) bucket.solo++;
    else bucket.multi++;
    if (e.device) bucket.devices.add(e.device);
  }

  const daily: DailyAudience[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKeyFor(i);
    const bucket = perDay.get(key);
    let label: string;
    if (key === todayKey) label = "Hoje";
    else if (key === yesterdayKey) label = "Ontem";
    else {
      const [, month, day] = key.split("-");
      label = `${day}/${month}`;
    }
    daily.push({
      key,
      label,
      uniqueDevices: bucket ? bucket.devices.size : 0,
      soloSessions: bucket ? bucket.solo : 0,
      multiplayerSessions: bucket ? bucket.multi : 0,
    });
  }

  return { daily, kpis };
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
