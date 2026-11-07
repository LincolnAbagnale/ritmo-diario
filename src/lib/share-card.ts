// Gera uma imagem de conquista (canvas) e compartilha pela Web Share API.
// Sem dependências: desenha um cartão escuro com o acento verde do Ritmo.

type ShareCard = {
  title: string;
  rate: number;
  streak: number;
  subtitle: string;
};

const BG = "#0C0D0E";
const CARD = "#16181A";
const BORDER = "#25282C";
const GREEN = "#30D158";
const MUTED = "#8A9099";

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCard(card: ShareCard): HTMLCanvasElement | null {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = CARD;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  roundedRect(ctx, 70, 70, W - 140, H - 140, 56);
  ctx.fill();
  ctx.stroke();

  const font = (size: number, weight = "600") =>
    `${weight} ${size}px -apple-system, "SF Pro Display", Inter, system-ui, sans-serif`;

  ctx.textAlign = "center";
  ctx.fillStyle = MUTED;
  ctx.font = font(34, "500");
  ctx.fillText("RITMO", W / 2, 180);

  ctx.fillStyle = "#F5F7F8";
  ctx.font = font(52);
  ctx.fillText(card.title, W / 2, 262);

  // Rosca de progresso
  const cx = W / 2;
  const cy = 600;
  const r = 190;
  ctx.lineWidth = 34;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#22262A";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  if (card.rate > 0) {
    ctx.save();
    ctx.shadowColor = GREEN;
    ctx.shadowBlur = 40;
    ctx.strokeStyle = GREEN;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.min(card.rate, 100)) / 100);
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = "#F5F7F8";
  ctx.font = font(150, "700");
  ctx.fillText(`${card.rate}%`, cx, cy + 32);
  ctx.fillStyle = MUTED;
  ctx.font = font(34, "500");
  ctx.fillText("de consistência", cx, cy + 92);

  ctx.fillStyle = GREEN;
  ctx.font = font(60, "700");
  ctx.fillText(`${card.streak} dias de sequência`, cx, 900);

  ctx.fillStyle = MUTED;
  ctx.font = font(32, "500");
  ctx.fillText(card.subtitle, cx, 960);

  return canvas;
}

const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));

export type ShareResult = "shared" | "downloaded" | "error";

export async function shareAchievement(card: ShareCard): Promise<ShareResult> {
  try {
    const canvas = drawCard(card);
    if (!canvas) return "error";
    const blob = await toBlob(canvas);
    if (!blob) return "error";

    const file = new File([blob], "ritmo-conquista.png", { type: "image/png" });
    const text = `${card.rate}% de consistência e ${card.streak} dias de sequência no Ritmo.`;

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Minha conquista no Ritmo", text });
      return "shared";
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ritmo-conquista.png";
    link.click();
    URL.revokeObjectURL(url);
    return "downloaded";
  } catch (error) {
    // Cancelar o menu de compartilhar não é um erro para o usuário.
    if (error instanceof DOMException && error.name === "AbortError") return "shared";
    return "error";
  }
}
