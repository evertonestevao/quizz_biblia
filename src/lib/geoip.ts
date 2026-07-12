import type { NextRequest } from "next/server";

export interface Geo {
  city: string | null;
  state: string | null;
  country: string | null;
}

/** Extrai o IP real do request (Cloudflare Tunnel primeiro, depois proxies comuns). */
export function getClientIp(request: NextRequest): string | null {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

/**
 * True apenas para IPs públicos roteáveis. Rejeita vazio/nulo, localhost e
 * faixas privadas/reservadas (IPv4 e IPv6) para não geolocalizar IP interno.
 */
export function isValidPublicIp(ip: string | null): boolean {
  if (!ip) return false;
  const value = ip.trim();
  if (!value) return false;

  if (value === "127.0.0.1" || value === "::1") return false;

  const ipv4 = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 127) return false; // 127.0.0.0/8 loopback
    if (a === 10) return false; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12
    if (a === 192 && b === 168) return false; // 192.168.0.0/16
    if (a === 169 && b === 254) return false; // 169.254.0.0/16 link-local
    return true;
  }

  const firstGroup = value.toLowerCase().split(":")[0];
  if (firstGroup.startsWith("fc") || firstGroup.startsWith("fd")) return false; // ULA
  if (["fe8", "fe9", "fea", "feb"].some((p) => firstGroup.startsWith(p))) return false; // link-local

  return true;
}

/**
 * Resolve a localização aproximada (cidade/estado/país) a partir do IP do
 * request, via geo-IP (ip-api). Retorna null se o IP não for público ou se a
 * consulta falhar/expirar. Best-effort, nunca lança.
 */
export async function lookupGeo(request: NextRequest): Promise<Geo | null> {
  const ip = getClientIp(request);
  if (!isValidPublicIp(ip)) return null;

  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip as string)}?fields=status,city,regionName,country`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return null;
    const g = (await res.json()) as {
      status?: string;
      city?: string;
      regionName?: string;
      country?: string;
    };
    if (g.status && g.status !== "success") return null;
    return {
      city: g.city ?? null,
      state: g.regionName ?? null,
      country: g.country ?? null,
    };
  } catch {
    return null;
  }
}

/** Rótulo curto e legível a partir de um geo (cidade > estado > país). */
export function geoLabel(geo: Geo | null): string | null {
  if (!geo) return null;
  return geo.city || geo.state || geo.country || null;
}
