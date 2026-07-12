import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/serverSupabase";
import { sendTelegramMessage } from "@/lib/telegram";
import { countPlayingPresence } from "@/lib/presenceServer";
import { formatSaoPaulo } from "@/lib/datetime";

export const runtime = "nodejs";

/**
 * Notifica (fire-and-forget) um bot do Telegram quando uma sala é iniciada.
 * Chamado pelo host no início da partida. Nunca quebra o fluxo do usuário: o
 * cliente dispara sem aguardar, e aqui tudo está sob try/catch.
 */
export async function POST(request: NextRequest) {
  try {
    const { code } = (await request.json()) as { code?: string };
    if (!code) return NextResponse.json({ ok: false }, { status: 400 });

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ ok: false });

    // Dados da sala + jogadores (ordem de entrada).
    const { data: room } = await supabase
      .from("rooms")
      .select("id, code, created_at")
      .eq("code", code.toUpperCase())
      .maybeSingle();
    if (!room) return NextResponse.json({ ok: false });

    const { data: playersData } = await supabase
      .from("players")
      .select("id, name, joined_at")
      .eq("room_id", room.id)
      .order("joined_at", { ascending: true });
    const players = (playersData as { id: string; name: string }[]) ?? [];

    // Localização aproximada (geo-IP) salva por jogador, para mostrar ao lado do nome.
    const { data: locData } = await supabase
      .from("player_locations")
      .select("player_id, city, state, country")
      .eq("room_id", room.id)
      .not("player_id", "is", null);
    const locByPlayer = new Map<string, string>();
    for (const l of (locData as {
      player_id: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
    }[]) ?? []) {
      if (!l.player_id || locByPlayer.has(l.player_id)) continue;
      const label = l.city || l.state || l.country;
      if (label) locByPlayer.set(l.player_id, label);
    }

    // Conexões Realtime ativas agora (presence global: salas + solo online).
    const realtime = await countPlayingPresence();

    const names = players.length
      ? players
          .map((p) => {
            const loc = locByPlayer.get(p.id);
            return loc ? `• 📍 ${loc} — ${p.name}` : `• ${p.name}`;
          })
          .join("\n")
      : "• (sem jogadores)";

    const message =
      `🎮 Sala iniciada: ${room.code}\n` +
      `🕐 Criada em: ${formatSaoPaulo(room.created_at)}\n` +
      `👥 Integrantes (${players.length}):\n${names}\n` +
      `--------------------------------\n` +
      `📡 Jogando agora (salas + solo): ${realtime ?? "n/d"}`;

    await sendTelegramMessage(message);

    return NextResponse.json({ ok: true });
  } catch {
    // Best-effort: nunca propaga erro.
    return NextResponse.json({ ok: false });
  }
}
