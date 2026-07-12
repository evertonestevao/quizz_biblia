import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/serverSupabase";
import { lookupGeo } from "@/lib/geoip";

export const runtime = "nodejs";

/**
 * Registra a localização aproximada (via geo-IP) de um jogador que entrou numa
 * sala, ou de quem jogou solo (source "solo", sem sala). Fire-and-forget:
 * qualquer falha é tratada silenciosamente e nunca bloqueia o jogador.
 */
export async function POST(request: NextRequest) {
  try {
    const { roomId, playerId, source } = (await request.json()) as {
      roomId?: string;
      playerId?: string;
      source?: "room" | "solo";
    };
    // Solo não tem sala (room_id fica null). Sala exige roomId.
    const isSolo = source === "solo";
    if (!isSolo && !roomId) return NextResponse.json({ ok: false }, { status: 400 });

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ ok: false });

    // Só geolocaliza (e só insere) IPs públicos válidos. IP local/privado/inválido
    // é ignorado — o jogador entra normalmente, apenas sem registro de local.
    const geo = await lookupGeo(request);
    if (!geo) return NextResponse.json({ ok: true, skipped: true });

    await supabase.from("player_locations").insert({
      room_id: isSolo ? null : roomId,
      player_id: isSolo ? null : playerId ?? null,
      source: isSolo ? "solo" : "room",
      city: geo.city,
      state: geo.state,
      country: geo.country,
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Nunca propaga erro: captura de localização é best-effort.
    return NextResponse.json({ ok: false });
  }
}
