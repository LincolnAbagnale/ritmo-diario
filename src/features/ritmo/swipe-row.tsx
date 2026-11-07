import { useRef, useState, type ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";

const ACTION_WIDTH = 96;
const OPEN_THRESHOLD = 48;

export function SwipeRow({ children, onDelete, onEdit }: { children: ReactNode; onDelete: () => void; onEdit?: () => void }) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef({ x: 0, y: 0, base: 0, locked: false, axis: "" as "" | "x" | "y" });
  const limit = onEdit ? ACTION_WIDTH + 24 : 0;

  const finish = () => {
    if (!start.current.locked) return;
    start.current.locked = false;
    setDragging(false);
    setOffset((current) => {
      if (current <= -OPEN_THRESHOLD) return -ACTION_WIDTH;
      if (onEdit && current >= OPEN_THRESHOLD) return ACTION_WIDTH;
      return 0;
    });
  };

  // A cor de fundo acompanha a direção do deslize: vermelho (apagar) ou verde (editar).
  // Assim o card desliza sobre a cor e nunca aparece o fundo preto.
  const dir = offset < 0 ? "delete" : offset > 0 ? "edit" : null;
  const bg = dir === "delete" ? "var(--destructive)" : dir === "edit" ? "var(--primary)" : "var(--card)";

  return (
    <div
      className="relative overflow-hidden rounded-[20px]"
      style={{ background: bg, transition: dragging ? "none" : "background 180ms cubic-bezier(0.32,0.72,0,1)" }}
    >
      {/* Botão apagar — à direita, transparente (a cor vem do contêiner) */}
      <div className="absolute inset-y-0 right-0 flex w-[96px] items-center justify-center text-destructive-foreground">
        <button
          type="button"
          aria-label="Apagar hábito"
          onClick={() => { setOffset(0); onDelete(); }}
          className="grid size-full place-items-center"
        >
          <Trash2 className="size-5" />
        </button>
      </div>
      {onEdit && (
        <div className="absolute inset-y-0 left-0 flex w-[96px] items-center justify-center text-primary-foreground">
          <button
            type="button"
            aria-label="Editar hábito"
            onClick={() => { setOffset(0); onEdit(); }}
            className="grid size-full place-items-center"
          >
            <Pencil className="size-5" />
          </button>
        </div>
      )}
      <div
        style={{
          transform: `translate3d(${offset}px,0,0)`,
          transition: dragging ? "none" : "transform 220ms cubic-bezier(0.32,0.72,0,1)",
          touchAction: "pan-y",
        }}
        className="relative will-change-transform"
        onPointerDown={(event) => {
          if (event.pointerType === "mouse") return;
          start.current = { x: event.clientX, y: event.clientY, base: offset, locked: true, axis: "" };
        }}
        onPointerMove={(event) => {
          if (!start.current.locked) return;
          const dx = event.clientX - start.current.x;
          const dy = event.clientY - start.current.y;
          if (!start.current.axis) {
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
            start.current.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
            if (start.current.axis === "y") { start.current.locked = false; return; }
            setDragging(true);
          }
          const next = start.current.base + dx;
          setOffset(Math.min(limit, Math.max(-ACTION_WIDTH - 24, next)));
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
        onClickCapture={(event) => {
          if (offset !== 0) { event.preventDefault(); event.stopPropagation(); setOffset(0); }
        }}
      >
        {children}
      </div>
    </div>
  );
}
