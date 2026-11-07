// Confete leve em canvas, sem dependências: partículas verdes por ~1,2s.
export function fireConfetti() {
  if (typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  Object.assign(canvas.style, {
    position: "fixed", inset: "0", width: "100%", height: "100%",
    pointerEvents: "none", zIndex: "9999",
  } as CSSStyleDeclaration);
  document.body.appendChild(canvas);
  ctx.scale(dpr, dpr);

  const colors = ["#30D158", "#34C759", "#7CE69B", "#1F9D43", "#B9F6CA"];
  const particles = Array.from({ length: 90 }, () => ({
    x: window.innerWidth / 2 + (Math.random() - 0.5) * 160,
    y: window.innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 9,
    vy: -(Math.random() * 9 + 4),
    size: Math.random() * 6 + 3,
    color: colors[Math.floor(Math.random() * colors.length)] ?? "#30D158",
    rotation: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.25,
    shape: Math.random() > 0.5 ? "rect" : "circle",
  }));

  const start = performance.now();
  const DURATION = 1200;
  const frame = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const fade = Math.max(0, 1 - t / DURATION);
    for (const p of particles) {
      p.vy += 0.22; // gravidade
      p.x += p.vx; p.y += p.vy; p.rotation += p.vr;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    if (t < DURATION) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

// Vibração tátil curta (ignorada onde não há suporte).
export function haptic(ms = 15) {
  try { navigator.vibrate?.(ms); } catch { /* sem suporte */ }
}
