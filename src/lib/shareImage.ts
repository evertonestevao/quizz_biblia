export interface ResultImageData {
  /** Rótulo do modo exibido no selo, ex.: "Solo" ou "Em grupo". */
  modeLabel: string;
  /** Nº de pessoas na sala (só no modo em grupo). Omitido no solo. */
  playersCount?: number;
  playerName: string;
  score: number;
  correct: number;
  answered: number;
  pct: number;
  message: string;
  versionLabel: string;
}

/** Domínio exibido no rodapé da imagem e usado no link de compartilhamento. */
export const SITE_DISPLAY = "www.cristaoquiz.com.br";
export const SITE_URL = "https://www.cristaoquiz.com.br";

// letterSpacing existe no CanvasRenderingContext2D moderno, mas nem todo
// @types cobre — setter tipado para não quebrar o build.
function setSpacing(ctx: CanvasRenderingContext2D, value: string) {
  (ctx as unknown as { letterSpacing: string }).letterSpacing = value;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Ajusta o tamanho da fonte até o texto caber em maxWidth. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: string,
  family: string,
  startPx: number,
  maxWidth: number,
) {
  let size = startPx;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 18 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
}

/**
 * Gera a imagem do resultado no formato quadrado (1080×1080), ideal para o feed
 * do Instagram, com a marca e o selo do modo no topo e o site no rodapé.
 * Desenhada em canvas para reproduzir fielmente o dourado e os brilhos do card.
 */
export async function generateResultImage(data: ResultImageData): Promise<Blob> {
  const W = 1080;
  const H = 1080;
  const cx = W / 2;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");

  // Garante que Cinzel/Inter estejam carregadas antes de desenhar.
  try {
    await document.fonts.ready;
  } catch {
    // segue com fallback de fonte
  }

  // Fundo
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#141033");
  bg.addColorStop(0.55, "#0F0B26");
  bg.addColorStop(1, "#0B1026");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(cx, 260, 0, cx, 260, 460);
  glow.addColorStop(0, "rgba(212,169,78,0.22)");
  glow.addColorStop(1, "rgba(212,169,78,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(cx, H, 0, cx, H, 520);
  glow2.addColorStop(0, "rgba(97,61,173,0.18)");
  glow2.addColorStop(1, "rgba(97,61,173,0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // Moldura
  ctx.strokeStyle = "rgba(212,169,78,0.30)";
  ctx.lineWidth = 2;
  roundRect(ctx, 36, 36, W - 72, H - 72, 40);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Marca
  ctx.fillStyle = "#F0C75E";
  setSpacing(ctx, "12px");
  ctx.font = "600 40px Cinzel, serif";
  ctx.fillText("CRISTÃO QUIZ", cx, 128);
  setSpacing(ctx, "0px");

  // Selo do modo (+ nº de pessoas, no grupo, + versão bíblica)
  const modeParts = [`MODO ${data.modeLabel.toUpperCase()}`];
  if (data.playersCount && data.playersCount > 0) {
    modeParts.push(`${data.playersCount} ${data.playersCount === 1 ? "PESSOA" : "PESSOAS"}`);
  }
  if (data.versionLabel) modeParts.push(data.versionLabel.toUpperCase());
  const modeText = modeParts.join(" · ");
  setSpacing(ctx, "4px");
  ctx.font = "600 24px Inter, sans-serif";
  const pillW = ctx.measureText(modeText).width + 56;
  const pillY = 152;
  const pillH = 46;
  ctx.fillStyle = "rgba(212,169,78,0.10)";
  ctx.strokeStyle = "rgba(212,169,78,0.40)";
  ctx.lineWidth = 2;
  roundRect(ctx, cx - pillW / 2, pillY, pillW, pillH, 23);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#F0C75E";
  ctx.fillText(modeText, cx, pillY + 31);
  setSpacing(ctx, "0px");

  // Saudação
  ctx.fillStyle = "#9B96B0";
  fitFont(ctx, `Parabéns, ${data.playerName}! 🎉`, "500", "Inter, sans-serif", 34, 860);
  ctx.fillText(`Parabéns, ${data.playerName}! 🎉`, cx, 258);

  // Troféu
  ctx.font = "88px serif";
  ctx.fillText("🏆", cx, 360);

  // Pontuação (dourado em gradiente)
  ctx.font = "700 144px Cinzel, serif";
  const goldGrad = ctx.createLinearGradient(cx - 200, 0, cx + 200, 0);
  goldGrad.addColorStop(0, "#B98C33");
  goldGrad.addColorStop(0.5, "#F0C75E");
  goldGrad.addColorStop(1, "#F7E3A1");
  ctx.fillStyle = goldGrad;
  ctx.fillText(String(data.score), cx, 496);

  ctx.fillStyle = "#9B96B0";
  setSpacing(ctx, "10px");
  ctx.font = "600 28px Inter, sans-serif";
  ctx.fillText("PONTOS", cx, 540);
  setSpacing(ctx, "0px");

  // Mensagem de desempenho
  ctx.fillStyle = "#F5F1E8";
  fitFont(ctx, data.message, "700", "Cinzel, serif", 46, 900);
  ctx.fillText(data.message, cx, 612);

  // Selo de aproveitamento
  const badge = `${data.pct}% de aproveitamento`;
  ctx.font = "600 30px Inter, sans-serif";
  const bw = ctx.measureText(badge).width + 64;
  const by = 644;
  const bh = 56;
  ctx.fillStyle = "rgba(52,211,153,0.12)";
  ctx.strokeStyle = "rgba(52,211,153,0.35)";
  ctx.lineWidth = 2;
  roundRect(ctx, cx - bw / 2, by, bw, bh, 28);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#34D399";
  ctx.fillText(badge, cx, by + 38);

  // Números da partida
  const boxX = 140;
  const boxY = 742;
  const boxW = W - 280;
  const boxH = 160;
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  roundRect(ctx, boxX, boxY, boxW, boxH, 28);
  ctx.fill();
  ctx.stroke();

  const cols = [
    { label: "ACERTOS", value: data.correct },
    { label: "PERGUNTAS", value: data.answered },
  ];
  const colW = boxW / cols.length;
  cols.forEach((c, i) => {
    const colCx = boxX + colW * i + colW / 2;
    if (i > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(boxX + colW * i, boxY + 30);
      ctx.lineTo(boxX + colW * i, boxY + boxH - 30);
      ctx.stroke();
    }
    ctx.fillStyle = "#F5F1E8";
    ctx.font = "700 60px Cinzel, serif";
    ctx.fillText(String(c.value), colCx, boxY + 84);
    ctx.fillStyle = "#9B96B0";
    setSpacing(ctx, "3px");
    ctx.font = "600 22px Inter, sans-serif";
    ctx.fillText(c.label, colCx, boxY + 128);
    setSpacing(ctx, "0px");
  });

  // Versículo
  ctx.fillStyle = "rgba(155,150,176,0.85)";
  fitFont(
    ctx,
    "“Lâmpada para os meus pés é a tua palavra.” — Sl 119:105",
    "italic 500",
    "Cinzel, serif",
    28,
    940,
  );
  ctx.fillText("“Lâmpada para os meus pés é a tua palavra.” — Sl 119:105", cx, 968);

  // Rodapé: site (com folga da borda inferior)
  ctx.fillStyle = "#F0C75E";
  setSpacing(ctx, "4px");
  ctx.font = "600 32px Inter, sans-serif";
  ctx.fillText(SITE_DISPLAY, cx, 1018);
  setSpacing(ctx, "0px");

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem"))),
      "image/png",
    );
  });
}

/**
 * Gera e compartilha a imagem do resultado. No mobile usa a Web Share API com o
 * arquivo (menu nativo); sem suporte (desktop), baixa a imagem. Cancelamento do
 * share nativo é ignorado. Lança se a geração da imagem falhar.
 */
export async function shareResultImage(data: ResultImageData): Promise<void> {
  const blob = await generateResultImage(data);
  const file = new File([blob], "cristao-quiz-resultado.png", { type: "image/png" });
  const text = `Joguei Cristão Quiz e fiz ${data.score} pontos! Consegue superar? ${SITE_URL}`;

  const canShareFile =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });

  if (canShareFile && typeof navigator.share === "function") {
    try {
      await navigator.share({ files: [file], title: "Meu resultado no Cristão Quiz", text });
    } catch {
      // Cancelou ou falhou: ignora.
    }
    return;
  }

  // Fallback (desktop / sem suporte a compartilhar arquivo): baixa a imagem.
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
