/**
 * Envio de mensagem para um bot do Telegram (Bot API). Fire-and-forget: nunca
 * lança — qualquer falha (rede, rate limit, token ausente) é engolida para não
 * quebrar o fluxo que a chamou.
 *
 * Requer as variáveis de ambiente (servidor):
 *   - TOKEN_TELEGRAM     → token do bot (@BotFather)
 *   - TELEGRAM_CHAT_ID   → id do chat/grupo/canal que recebe as mensagens
 */
export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TOKEN_TELEGRAM;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return; // não configurado: silencioso

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
  } catch {
    // fire-and-forget: falha de rede/rate limit não pode quebrar nada
  }
}
