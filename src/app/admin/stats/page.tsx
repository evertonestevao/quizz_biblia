"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  fetchRooms,
  fetchLocations,
  fetchDailyStats,
  groupByCity,
  geocodeCities,
  type RoomSummary,
  type CityGroup,
  type DailyStat,
} from "@/lib/admin";
import type { MapPoint } from "@/components/admin/LocationsMap";

// Leaflet acessa `window`, então o mapa só pode renderizar no cliente.
const LocationsMap = dynamic(() => import("@/components/admin/LocationsMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted2">Carregando mapa…</div>,
});

type Mode = "room" | "all";

export default function AdminStatsPage() {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [mode, setMode] = useState<Mode>("room");
  const [groups, setGroups] = useState<CityGroup[]>([]);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [daily, setDaily] = useState<DailyStat[]>([]);

  // Carrega a lista de salas e o resumo diário uma vez.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Supabase não configurado.");
      return;
    }
    fetchRooms()
      .then((r) => {
        setRooms(r);
        if (r.length) setSelectedRoom(r[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar salas."));
    fetchDailyStats()
      .then(setDaily)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar o resumo diário."));
  }, []);

  const roomId = mode === "all" ? null : selectedRoom || null;

  // Recarrega localizações + geocodifica sempre que muda a sala ou o modo.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (mode === "room" && !selectedRoom) {
      setGroups([]);
      setPoints([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const locations = await fetchLocations(roomId);
        const grouped = groupByCity(locations);
        if (cancelled) return;
        setGroups(grouped);

        if (!grouped.length) {
          setPoints([]);
          return;
        }
        const coords = await geocodeCities(grouped);
        if (cancelled) return;
        const mapped: MapPoint[] = [];
        for (const g of grouped) {
          const c = coords.get(`${g.city ?? ""}|${g.state ?? ""}|${g.country ?? ""}`);
          if (c) mapped.push({ lat: c.lat, lng: c.lng, label: g.label, count: g.count });
        }
        setPoints(mapped);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar localizações.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // roomId deriva de mode+selectedRoom
  }, [mode, selectedRoom, roomId]);

  const totalPlayers = useMemo(() => groups.reduce((sum, g) => sum + g.count, 0), [groups]);

  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <h1 className="text-2xl font-semibold text-parchment">Estatísticas — Localização dos jogadores</h1>
      <p className="mt-1 text-sm text-muted2">Painel interno. Origem aproximada (geo-IP) de quem jogou.</p>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div className="flex gap-2">
          <Button variant={mode === "room" ? "gold" : "subtle"} onClick={() => setMode("room")}>
            Por partida
          </Button>
          <Button variant={mode === "all" ? "gold" : "subtle"} onClick={() => setMode("all")}>
            Total agregado
          </Button>
        </div>

        {mode === "room" && (
          <div className="min-w-[280px] flex-1">
            <Select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>
              {rooms.length === 0 && <option value="">Nenhuma sala encontrada</option>}
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} · {r.status} · {r.question_count} perguntas ·{" "}
                  {new Date(r.created_at).toLocaleString("pt-BR")}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      <div className="mt-4 flex items-center gap-4 text-sm text-muted2">
        <span>
          {loading
            ? "Carregando…"
            : `${totalPlayers} jogador${totalPlayers === 1 ? "" : "es"} · ${groups.length} cidade${
                groups.length === 1 ? "" : "s"
              }`}
        </span>
      </div>

      <div className="mt-4 h-[460px] overflow-hidden rounded-xl border border-white/[0.14]">
        {points.length > 0 ? (
          <LocationsMap points={points} />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted2">
            {loading ? "Carregando mapa…" : "Sem localizações para exibir."}
          </div>
        )}
      </div>

      {groups.length > 0 && (
        <table className="mt-6 w-full text-left text-sm">
          <thead className="text-muted2">
            <tr>
              <th className="py-2">Cidade</th>
              <th className="py-2">País</th>
              <th className="py-2 text-right">Jogadores</th>
            </tr>
          </thead>
          <tbody className="text-parchment">
            {groups.map((g) => (
              <tr key={g.label} className="border-t border-white/[0.08]">
                <td className="py-2">{g.label}</td>
                <td className="py-2">{g.country ?? "—"}</td>
                <td className="py-2 text-right font-semibold">{g.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-parchment">Últimos 10 dias</h2>
        <p className="mt-1 text-sm text-muted2">Partidas criadas e jogadores por dia (fuso de São Paulo).</p>

        {daily.length > 0 ? (
          <ul className="mt-4 divide-y divide-white/[0.08] rounded-xl border border-white/[0.14]">
            {daily.map((d) => (
              <li key={d.key} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-semibold text-parchment">{d.label}</span>
                <span className="text-muted2">
                  {d.rooms} partida{d.rooms === 1 ? "" : "s"}, {d.players} jogador
                  {d.players === 1 ? "" : "es"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted2">Nenhuma partida nos últimos 10 dias.</p>
        )}
      </section>
    </main>
  );
}
