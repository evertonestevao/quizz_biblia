import { useEffect } from "react";
import { trackPlayingPresence } from "@/lib/presence";

/**
 * Marca este dispositivo como "jogando agora" enquanto a tela estiver montada.
 * Chame no topo de qualquer página de jogo (solo, lobby ou partida).
 */
export function usePlayingPresence() {
  useEffect(() => trackPlayingPresence(), []);
}
