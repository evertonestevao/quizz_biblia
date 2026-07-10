import { getSupabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/storage";

/** Canal de presença compartilhado por todas as telas de jogo. */
const PLAYING_CHANNEL = "presence:playing";

/**
 * Anuncia este dispositivo como "jogando agora" no canal de presença, enquanto a
 * chamada estiver ativa. A chave de presença é o device_id, então várias abas do
 * mesmo aparelho contam como um só. Retorna uma função de limpeza (chame ao sair
 * da tela) que remove a presença. No-op se o Supabase não estiver configurado.
 */
export function trackPlayingPresence(): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const deviceId = getDeviceId() || `anon-${Math.random().toString(36).slice(2)}`;
  const channel = supabase.channel(PLAYING_CHANNEL, {
    config: { presence: { key: deviceId } },
  });

  channel.subscribe((subStatus) => {
    if (subStatus === "SUBSCRIBED") {
      void channel.track({ device_id: deviceId, online_at: new Date().toISOString() });
    }
  });

  return () => {
    void channel.untrack();
    supabase.removeChannel(channel);
  };
}

/**
 * Observa (somente leitura) quantos dispositivos estão jogando agora. O
 * observador não se registra como presente, então não se conta. Chama
 * `onChange` com a contagem a cada sincronização. Retorna a limpeza.
 */
export function subscribeOnlineCount(onChange: (count: number) => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel = supabase.channel(PLAYING_CHANNEL, {
    config: { presence: { key: `observer-${Math.random().toString(36).slice(2)}` } },
  });

  const emit = () => {
    // Cada chave = um dispositivo (device_id). Observadores não dão track,
    // então não aparecem no estado de presença.
    onChange(Object.keys(channel.presenceState()).length);
  };

  channel
    .on("presence", { event: "sync" }, emit)
    .on("presence", { event: "join" }, emit)
    .on("presence", { event: "leave" }, emit)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
