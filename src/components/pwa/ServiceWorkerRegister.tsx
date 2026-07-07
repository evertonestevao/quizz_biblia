"use client";

import { useEffect } from "react";

/** Registra o service worker apenas em produção (npm run build + start / Vercel). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sem service worker o app continua funcionando normalmente (só não instala/offline)
    });
  }, []);

  return null;
}
