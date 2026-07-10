import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/serverSupabase";
import { sendTelegramMessage } from "@/lib/telegram";
import { countPlayingPresence } from "@/lib/presenceServer";

export const runtime = "nodejs";

const SP_TZ = "America/Sao_Paulo";

function formatSaoPaulo(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: SP_TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

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
      .select("name, joined_at")
      .eq("room_id", room.id)
      .order("joined_at", { ascending: true });
    const players = (playersData as { name: string }[]) ?? [];

    // Conexões Realtime ativas agora (presence global: salas + solo online).
    const realtime = await countPlayingPresence();

    const names = players.length
      ? players.map((p) => `• ${p.name}`).join("\n")
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
