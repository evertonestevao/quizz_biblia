export interface ResultImageData {
  playerName: string;
  score: number;
  correct: number;
  answered: number;
  wrong: number;
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
  while (size > 20 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
}

/**
 * Gera a imagem do resultado no formato ideal para o feed do Instagram
 * (1080×1350, proporção 4:5), com a marca no topo e o site no rodapé. Desenhada
 * em canvas para reproduzir fielmente o dourado e os brilhos do card.
 */
export async function generateResultImage(data: ResultImageData): Promise<Blob> {
  const W = 1080;
  const H = 1350;
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

  const glow = ctx.createRadialGradient(cx, 300, 0, cx, 300, 480);
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
  roundRect(ctx, 40, 40, W - 80, H - 80, 40);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Marca
  ctx.fillStyle = "#F0C75E";
  setSpacing(ctx, "12px");
  ctx.font = "600 42px Cinzel, serif";
  ctx.fillText("CRISTÃO QUIZ", cx, 168);
  setSpacing(ctx, "0px");

  // Saudação
  ctx.fillStyle = "#9B96B0";
  fitFont(ctx, `Parabéns, ${data.playerName}! 🎉`, "500", "Inter, sans-serif", 36, 860);
  ctx.fillText(`Parabéns, ${data.playerName}! 🎉`, cx, 258);

  // Troféu
  ctx.font = "120px serif";
  ctx.fillText("🏆", cx, 440);

  // Pontuação (dourado em gradiente)
  ctx.font = "700 172px Cinzel, serif";
  const goldGrad = ctx.createLinearGradient(cx - 220, 0, cx + 220, 0);
  goldGrad.addColorStop(0, "#B98C33");
  goldGrad.addColorStop(0.5, "#F0C75E");
  goldGrad.addColorStop(1, "#F7E3A1");
  ctx.fillStyle = goldGrad;
  ctx.fillText(String(data.score), cx, 630);

  ctx.fillStyle = "#9B96B0";
  setSpacing(ctx, "10px");
  ctx.font = "600 30px Inter, sans-serif";
  ctx.fillText("PONTOS", cx, 685);
  setSpacing(ctx, "0px");

  // Mensagem de desempenho
  ctx.fillStyle = "#F5F1E8";
  fitFont(ctx, data.message, "700", "Cinzel, serif", 54, 900);
  ctx.fillText(data.message, cx, 775);

  // Selo de aproveitamento
  const badge = `${data.pct}% de aproveitamento`;
  ctx.font = "600 30px Inter, sans-serif";
  const bw = ctx.measureText(badge).width + 64;
  const by = 812;
  const bh = 62;
  ctx.fillStyle = "rgba(52,211,153,0.12)";
  ctx.strokeStyle = "rgba(52,211,153,0.35)";
  ctx.lineWidth = 2;
  roundRect(ctx, cx - bw / 2, by, bw, bh, 31);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#34D399";
  ctx.fillText(badge, cx, by + 41);

  // Números da partida
  const boxX = 130;
  const boxY = 940;
  const boxW = W - 260;
  const boxH = 180;
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  roundRect(ctx, boxX, boxY, boxW, boxH, 28);
  ctx.fill();
  ctx.stroke();

  const cols = [
    { label: "PERGUNTAS", value: data.answered },
    { label: "ACERTOS", value: data.correct },
    { label: "ERROS", value: data.wrong },
  ];
  const colW = boxW / 3;
  cols.forEach((c, i) => {
    const colCx = boxX + colW * i + colW / 2;
    if (i > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(boxX + colW * i, boxY + 32);
      ctx.lineTo(boxX + colW * i, boxY + boxH - 32);
      ctx.stroke();
    }
    ctx.fillStyle = "#F5F1E8";
    ctx.font = "700 66px Cinzel, serif";
    ctx.fillText(String(c.value), colCx, boxY + 96);
    ctx.fillStyle = "#9B96B0";
    setSpacing(ctx, "3px");
    ctx.font = "600 24px Inter, sans-serif";
    ctx.fillText(c.label, colCx, boxY + 142);
    setSpacing(ctx, "0px");
  });

  if (data.versionLabel) {
    ctx.fillStyle = "rgba(155,150,176,0.6)";
    setSpacing(ctx, "3px");
    ctx.font = "600 22px Inter, sans-serif";
    ctx.fillText(data.versionLabel.toUpperCase(), cx, 1176);
    setSpacing(ctx, "0px");
  }

  // Versículo
  ctx.fillStyle = "rgba(155,150,176,0.85)";
  ctx.font = "italic 500 30px Cinzel, serif";
  ctx.fillText("“Lâmpada para os meus pés é a tua palavra.” — Sl 119:105", cx, 1236);

  // Rodapé: site
  ctx.fillStyle = "#F0C75E";
  setSpacing(ctx, "4px");
  ctx.font = "600 34px Inter, sans-serif";
  ctx.fillText(SITE_DISPLAY, cx, 1300);
  setSpacing(ctx, "0px");

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem"))),
      "image/png",
    );
  });
}
