"use client";

import { useEffect } from "react";
import { ensureDeviceId } from "@/lib/storage";

/**
 * Garante que o device_id exista assim que o app carrega, antes de o jogador
 * entrar em qualquer sala. Não renderiza nada.
 */
export function DeviceIdInit() {
  useEffect(() => {
    ensureDeviceId();
  }, []);

  return null;
}
