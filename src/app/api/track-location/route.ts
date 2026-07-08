import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/serverSupabase";

export const runtime = "nodejs";

/** Extrai o IP real do request (Cloudflare Tunnel primeiro, depois proxies comuns). */
function getClientIp(request: NextRequest): string | null {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

/**
 * Retorna true apenas para IPs públicos roteáveis. Rejeita vazio/nulo, localhost
 * e faixas privadas/reservadas (IPv4 e IPv6) para não geolocalizar IP interno
 * (o que geraria localização genérica/incorreta nas estatísticas).
 */
function isValidPublicIp(ip: string | null): boolean {
  if (!ip) return false;
  const value = ip.trim();
  if (!value) return false;

  // Localhost
  if (value === "127.0.0.1" || value === "::1") return false;

  // IPv4: verifica loopback e faixas privadas/reservadas
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

  // IPv6: verifica faixas reservadas pelo primeiro grupo do endereço
  const firstGroup = value.toLowerCase().split(":")[0];
  if (firstGroup.startsWith("fc") || firstGroup.startsWith("fd")) return false; // fc00::/7 ULA
  if (["fe8", "fe9", "fea", "feb"].some((p) => firstGroup.startsWith(p))) return false; // fe80::/10 link-local

  return true;
}

interface GeoResult {
  city?: string;
  regionName?: string;
  country?: string;
  status?: string;
}

/**
 * Registra a localização aproximada (via geo-IP) de um jogador que entrou numa sala.
 * Fire-and-forget: qualquer falha é tratada silenciosamente e nunca bloqueia o jogador.
 */
export async function POST(request: NextRequest) {
  try {
    const { roomId } = (await request.json()) as { roomId?: string };
    if (!roomId) return NextResponse.json({ ok: false }, { status: 400 });

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ ok: false });

    const ip = getClientIp(request);
    // Só geolocaliza (e só insere) IPs públicos válidos. IP local/privado/inválido
    // é ignorado — o jogador entra na sala normalmente, apenas sem registro de local.
    if (!isValidPublicIp(ip)) {
      console.warn(`[track-location] IP ignorado (não é público válido): ${ip ?? "(vazio)"}`);
      return NextResponse.json({ ok: true, skipped: true });
    }
    const publicIp = ip as string;

    let geo: GeoResult = {};
    try {
      const res = await fetch(
        `http://ip-api.com/json/${encodeURIComponent(publicIp)}?fields=status,city,regionName,country`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (res.ok) geo = (await res.json()) as GeoResult;
    } catch {
      // geo-IP indisponível: segue sem localização
    }

    if (geo.status && geo.status !== "success") {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await supabase.from("player_locations").insert({
      room_id: roomId,
      city: geo.city ?? null,
      state: geo.regionName ?? null,
      country: geo.country ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Nunca propaga erro: captura de localização é best-effort.
    return NextResponse.json({ ok: false });
  }
}
