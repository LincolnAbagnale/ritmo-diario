import { useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { haptic } from "@/lib/confetti";

const THRESHOLD = 72;

/**
 * Puxar para atualizar: ao arrastar para baixo no topo da página,
 * revela um indicador e, ao soltar além do limite, recarrega os dados.
 */
export function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<unknown> | void; children: ReactNode }) {
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (touch && window.scrollY <= 0 && !refreshing) startY.current = touch.clientY;
    else startY.current = null;
  };

  const onTouchMove = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (startY.current === null || !touch) return;
    const delta = touch.clientY - startY.current;
    if (delta <= 0) {
      if (pull !== 0) setPull(0);
      return;
    }
    // Resistência progressiva, como no iOS.
    setPull(Math.min(delta * 0.45, THRESHOLD + 24));
  };

  const onTouchEnd = () => {
    if (startY.current === null) return;
    startY.current = null;
    if (pull >= THRESHOLD && !refreshing) {
      haptic(12);
      setRefreshing(true);
      void Promise.resolve(onRefresh())
        .catch(() => undefined)
        .finally(() => setTimeout(() => { setRefreshing(false); setPull(0); }, 500));
      setPull(THRESHOLD * 0.6);
      return;
    }
    setPull(0);
  };

  const visible = refreshing ? THRESHOLD * 0.6 : pull;
  const progress = Math.min(pull / THRESHOLD, 1);

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center"
        style={{
          opacity: visible > 4 ? 1 : 0,
          transform: `translateY(${visible * 0.55 + 4}px)`,
          transition: startY.current !== null ? "none" : "transform 240ms cubic-bezier(0.32,0.72,0,1), opacity 200ms",
        }}
      >
        <div className="paint-safe grid size-9 place-items-center rounded-full border border-border bg-card shadow-lg">
          {refreshing
            ? <Loader2 className="size-4 animate-spin text-primary" />
            : <Loader2 className="size-4 text-primary" style={{ transform: `rotate(${progress * 270}deg)`, opacity: 0.35 + progress * 0.65 }} />}
        </div>
      </div>
      <div
        style={{
          transform: visible > 0 ? `translateY(${visible * 0.5}px)` : undefined,
          transition: startY.current !== null ? "none" : "transform 240ms cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
