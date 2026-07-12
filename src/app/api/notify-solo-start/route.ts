import { NextResponse, type NextRequest } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";
import { countPlayingPresence } from "@/lib/presenceServer";
import { lookupGeo, geoLabel } from "@/lib/geoip";
import { formatSaoPaulo } from "@/lib/datetime";

export const runtime = "nodejs";

/**
 * Notifica (fire-and-forget) um bot do Telegram quando um jogo solo começa.
 * Disparado pelo cliente sem aguardar; só roda online. Nunca quebra o fluxo do
 * jogo (tudo sob try/catch).
 */
export async function POST(request: NextRequest) {
  try {
    const { playerName, versionLabel } = (await request.json()) as {
      playerName?: string;
      versionLabel?: string;
    };

    const loc = geoLabel(await lookupGeo(request));
    const realtime = await countPlayingPresence();

    const name = playerName?.trim() || "Jogador";
    const version = versionLabel?.trim();

    const message =
      `📖 Jogo solo iniciado\n` +
      `🕐 ${formatSaoPaulo(new Date())}\n` +
      `🙋 ${name}${version ? ` · ${version}` : ""}\n` +
      (loc ? `📍 ${loc}\n` : "") +
      `--------------------------------\n` +
      `📡 Jogando agora (salas + solo): ${realtime ?? "n/d"}`;

    await sendTelegramMessage(message);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
