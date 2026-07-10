"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  fetchRooms,
  fetchLocations,
  fetchAudienceReport,
  groupByCity,
  geocodeCities,
  type RoomSummary,
  type CityGroup,
  type AudienceReport,
} from "@/lib/admin";
import { AudienceTrend } from "@/components/admin/AudienceTrend";
import { subscribeOnlineCount } from "@/lib/presence";
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
  const [report, setReport] = useState<AudienceReport | null>(null);
  const [online, setOnline] = useState<number | null>(null);

  // Presença em tempo real: dispositivos jogando agora.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    return subscribeOnlineCount(setOnline);
  }, []);

  // Carrega a lista de salas e o relatório de audiência uma vez.
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
    fetchAudienceReport()
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar a audiência."));
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

  const k = report?.kpis;
  const nf = (n: number) => n.toLocaleString("pt-BR");

  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <h1 className="text-2xl font-semibold text-parchment">Painel — Audiência &amp; Negócio</h1>
      <p className="mt-1 text-sm text-muted2">
        Painel interno. Alcance e engajamento por dispositivo (salas + solo), base para venda de
        espaços publicitários.
      </p>

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-5">
          <div>
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-emerald-300">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              Conectados agora
            </p>
            <p className="mt-1 text-4xl font-semibold text-parchment">
              {online === null ? "—" : nf(online)}
            </p>
            <p className="mt-1 text-xs text-muted2">dispositivos jogando neste momento (tempo real)</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-white/[0.14] bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wide text-muted2">Dispositivos únicos</p>
            <p className="mt-1 text-3xl font-semibold text-parchment">{k ? nf(k.unique30d) : "—"}</p>
            <p className="mt-1 text-xs text-muted2">
              últimos 30 dias{k ? ` · hoje ${nf(k.uniqueToday)} · 7d ${nf(k.unique7d)}` : ""}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.14] bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wide text-muted2">Sessões (30d)</p>
            <p className="mt-1 text-3xl font-semibold text-parchment">{k ? nf(k.sessions30d) : "—"}</p>
            <p className="mt-1 text-xs text-muted2">
              {k ? `${nf(k.multiplayer30d)} salas · ${nf(k.solo30d)} solo (${Math.round(k.soloSharePct)}% solo)` : "—"}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.14] bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wide text-muted2">Novos dispositivos</p>
            <p className="mt-1 text-3xl font-semibold text-parchment">{k ? nf(k.newDevices30d) : "—"}</p>
            <p className="mt-1 text-xs text-muted2">
              {k ? `${nf(k.returning30d)} recorrentes (2+ sessões)` : "últimos 30 dias"}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.14] bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wide text-muted2">Sessões / dispositivo</p>
            <p className="mt-1 text-3xl font-semibold text-parchment">
              {k ? k.sessionsPerDevice30d.toFixed(1) : "—"}
            </p>
            <p className="mt-1 text-xs text-muted2">engajamento médio (30d)</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/[0.14] bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold text-parchment">Sessões por dia</h2>
          <p className="mb-4 mt-0.5 text-xs text-muted2">
            Composição salas × solo · últimos 14 dias (7 no celular). Passe o mouse para o detalhe do dia.
          </p>
          {report ? (
            <AudienceTrend data={report.daily} />
          ) : (
            <div className="grid h-48 place-items-center text-sm text-muted2">Carregando…</div>
          )}
        </div>
      </section>

      <hr className="my-10 border-white/[0.08]" />

      <h2 className="text-lg font-semibold text-parchment">Localização dos jogadores</h2>
      <p className="mt-1 text-sm text-muted2">Origem aproximada (geo-IP) de quem entrou nas salas.</p>

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

    </main>
  );
}
