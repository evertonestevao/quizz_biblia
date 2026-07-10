import { createClient } from "@supabase/supabase-js";

/**
 * Conta, no servidor, quantas conexões Realtime estão ativas agora no canal de
 * presença global `presence:playing` — soma de todos os participantes
 * conectados em salas (lobby/partida) e no solo online.
 *
 * Entra no canal como observador (sem `track`, então não se conta), espera o
 * primeiro `sync` e devolve o total de chaves de presença. Retorna `null` se o
 * Supabase não estiver configurado ou se não sincronizar dentro do timeout.
 */
export async function countPlayingPresence(timeoutMs = 2500): Promise<number | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  // Client dedicado (efêmero) só para esta leitura, para não interferir no
  // client de banco do servidor.
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return new Promise<number | null>((resolve) => {
    let settled = false;
    const channel = client.channel("presence:playing", {
      config: { presence: { key: `server-observer-${Math.random().toString(36).slice(2)}` } },
    });

    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        client.removeChannel(channel);
      } catch {
        // ignora
      }
      try {
        client.realtime.disconnect();
      } catch {
        // ignora
      }
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    channel
      .on("presence", { event: "sync" }, () => {
        finish(Object.keys(channel.presenceState()).length);
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          finish(null);
        }
      });
  });
}
