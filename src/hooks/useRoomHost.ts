import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { claimHost, markRoomAbandoned } from "@/lib/room";
import type { Player } from "@/types/room";

const HOST_NOTICE_MS = 6000;

interface HostChangedPayload {
  hostId: string;
}

interface UseRoomHostOptions {
  roomId: string | null;
  playerId: string | null;
  /** Host atual (de `rooms.host_player_id`). */
  hostPlayerId: string | null;
  /** Jogadores na ordem de entrada (joined_at ascendente). */
  players: Player[];
  /** Status atual da sala (para decidir se encerra ao esvaziar). */
  roomStatus: string | null;
  /** Só monitora enquanto o jogador está de fato na sala. */
  active: boolean;
  /** Notificado quando o host muda (promoção local ou broadcast recebido). */
  onHostChanged?: (hostId: string) => void;
}

/**
 * Transferência automática de anfitrião via Supabase Realtime Presence.
 *
 * Todos os clientes da sala entram num canal de presença (chave = playerId).
 * Quando o host some da presença, o **primeiro jogador presente na ordem de
 * entrada** se auto-promove com uma escrita condicional no banco (só um vence a
 * corrida) e avisa os demais por broadcast. Como o lobby/jogo já re-buscam a
 * sala a cada UPDATE, a UI de todos reflete o novo host automaticamente.
 *
 * Se o último presente sai e a sala ainda estava no lobby, ela é encerrada.
 *
 * Retorna `becameHost` = true por alguns segundos após ESTE cliente virar host,
 * para exibir um aviso "Você agora é o anfitrião".
 */
export function useRoomHost({
  roomId,
  playerId,
  hostPlayerId,
  players,
  roomStatus,
  active,
  onHostChanged,
}: UseRoomHostOptions): { becameHost: boolean } {
  const [becameHost, setBecameHost] = useState(false);

  // Refs mantêm os valores atuais sem re-subscrever o canal a cada render.
  const hostRef = useRef<string | null>(hostPlayerId);
  const playersRef = useRef<Player[]>(players);
  const statusRef = useRef<string | null>(roomStatus);
  const changedRef = useRef(onHostChanged);
  const claimingRef = useRef(false);

  useEffect(() => {
    hostRef.current = hostPlayerId;
  }, [hostPlayerId]);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);
  useEffect(() => {
    statusRef.current = roomStatus;
  }, [roomStatus]);
  useEffect(() => {
    changedRef.current = onHostChanged;
  }, [onHostChanged]);

  useEffect(() => {
    if (!active || !roomId || !playerId) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase.channel(`room-host:${roomId}`, {
      config: { presence: { key: playerId } },
    });

    const evaluate = () => {
      const present = new Set(Object.keys(channel.presenceState()));
      const host = hostRef.current;
      if (!host || present.has(host)) return; // host ainda conectado

      // Host saiu: o próximo presente na ordem de entrada assume.
      const candidate = playersRef.current.find((p) => present.has(p.id));
      if (!candidate || candidate.id !== playerId) return; // não sou o próximo
      if (claimingRef.current) return;

      claimingRef.current = true;
      claimHost(roomId, playerId, host)
        .then((ok) => {
          if (!ok) return; // outro cliente venceu a corrida
          hostRef.current = playerId;
          void channel.send({
            type: "broadcast",
            event: "host_changed",
            payload: { hostId: playerId } as HostChangedPayload,
          });
          setBecameHost(true);
          setTimeout(() => setBecameHost(false), HOST_NOTICE_MS);
          changedRef.current?.(playerId);
        })
        .finally(() => {
          claimingRef.current = false;
        });
    };

    channel
      .on("presence", { event: "sync" }, evaluate)
      .on("broadcast", { event: "host_changed" }, ({ payload }) => {
        const hostId = (payload as HostChangedPayload).hostId;
        hostRef.current = hostId;
        changedRef.current?.(hostId);
      })
      .subscribe((subStatus) => {
        if (subStatus === "SUBSCRIBED") {
          void channel.track({ pid: playerId });
        }
      });

    return () => {
      // Se este era o último presente e a sala ainda estava no lobby, encerra-a.
      const others = Object.keys(channel.presenceState()).filter((k) => k !== playerId);
      if (others.length === 0 && statusRef.current === "lobby") {
        void markRoomAbandoned(roomId);
      }
      void channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [active, roomId, playerId]);

  return { becameHost };
}
