import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getDeviceId } from "@/lib/storage";

/**
 * Registra (fire-and-forget) uma sessão de jogo solo, associada ao device_id,
 * para métricas de audiência (dispositivos únicos ao longo do tempo).
 *
 * Só faz sentido — e só roda — quando há conexão: se o Supabase não está
 * configurado ou o navegador está offline, não faz nada (jogo offline não
 * precisa ser contabilizado). Nunca bloqueia nem quebra o fluxo do jogo.
 */
export function trackSoloSession(bibleVersion: string): void {
  if (!isSupabaseConfigured) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  const supabase = getSupabase();
  if (!supabase) return;

  try {
    void supabase
      .from("solo_sessions")
      .insert({ device_id: getDeviceId(), bible_version: bibleVersion })
      .then(() => {}, () => {}); // sucesso/erro ignorados silenciosamente
  } catch {
    // ignora silenciosamente
  }
}
