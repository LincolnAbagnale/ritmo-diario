import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type TransitionEvent as ReactTransitionEvent } from "react";
import { Check, ChevronLeft, ChevronRight, LockKeyhole, Minus, Share2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/features/ritmo/ui";
import { useRitmo, type Habit } from "@/features/ritmo/store";
import { isScheduledOn } from "@/features/ritmo/schedule";
import { shareAchievement } from "@/lib/share-card";
import { haptic } from "@/lib/confetti";

export const Route = createFileRoute("/progresso")({ head: () => ({ meta: [
  { title: "Progresso — Ritmo" }, { name: "description", content: "Veja sua consistência e marcos de hábitos no Ritmo." }, { property: "og:title", content: "Progresso — Ritmo" }, { property: "og:description", content: "Veja sua consistência e marcos de hábitos no Ritmo." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: ProgressPage });

type Period = "Hoje" | "Esta semana" | "Este mês" | "Total";
const periods: Period[] = ["Hoje", "Esta semana", "Este mês", "Total"];


const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
// Usa a mesma regra da tela Hoje: semanais pelos dias da semana, mensais pelas datas escolhidas.
const scheduled = (habit: Habit, date: Date) => habit.active && isScheduledOn(habit, date);

// Conta ocorrências agendadas e concluídas dentro de um intervalo de datas.
function rateBetween(habits: Habit[], from: Date, to: Date) {
  let total = 0; let done = 0;
  const cursor = new Date(from);
  while (cursor <= to) {
    const key = iso(cursor);
    for (const habit of habits) if (scheduled(habit, cursor)) { total += 1; if (habit.completions.includes(key)) done += 1; }
    cursor.setDate(cursor.getDate() + 1);
  }
  return { rate: total ? Math.round((done / total) * 100) : 0, done, total };
}

// Maior sequência de dias agendados e concluídos consecutivamente dentro do intervalo.
function bestStreakInRange(habits: Habit[], from: Date, to: Date) {
  let best = 0;
  for (const habit of habits) {
    if (!habit.active) continue;
    let run = 0;
    const cur = new Date(from);
    while (cur <= to) {
      const key = iso(cur);
      if (isScheduledOn(habit, cur)) {
        if (habit.completions.includes(key)) { run += 1; if (run > best) best = run; }
        else run = 0;
      }
      cur.setDate(cur.getDate() + 1);
    }
  }
  return best;
}

// Rótulo do período anterior, exibido ao lado da seta de tendência.
function previousLabel(period: Period, now: Date): string | null {
  if (period === "Hoje") return "ontem";
  if (period === "Esta semana") return "Semana anterior";
  if (period === "Este mês") return new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  return null;
}

function rangeFor(period: Period, now: Date, offset = 0) { const end = new Date(now); const start = new Date(now);
  if (offset) {
    if (period === "Hoje") { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); }
    else if (period === "Este mês") { start.setMonth(start.getMonth() - 1, 1); end.setDate(0); }
    else { start.setDate(start.getDate() - 13); end.setDate(end.getDate() - 7); }
    return { start, end };
  }
  if (period === "Esta semana") { const monday = (now.getDay() + 6) % 7; start.setDate(now.getDate() - monday); }
  else if (period === "Este mês") start.setDate(1);
  else if (period === "Total") start.setFullYear(start.getFullYear() - 1);
  return { start, end };
}

// Um dia do calendário: número com rosca de progresso ao redor, com brilho
// verde quando há conclusão — mesmo estilo da sequência da tela inicial.
function DayRing({ day, rate, future }: { day: number; rate: number; future: boolean }) {
  const [showRate, setShowRate] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const revealRate = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowRate(true);
    timerRef.current = setTimeout(() => setShowRate(false), 1200);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={revealRate}
      className="relative mx-auto size-11 rounded-full bg-card p-0 hover:bg-transparent [&>svg]:!size-full"
      aria-label={`Dia ${day}, ${rate}% de consistência`}
    >
      <svg viewBox="0 0 44 44" className="size-full -rotate-90" style={{ overflow: "visible" }}>
        <defs>
          <filter id={`rg-${day}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx="22" cy="22" r="19" pathLength="100" fill="var(--card)" stroke="currentColor" strokeWidth="3" className={future ? "text-secondary/50" : "text-secondary"} />
        {!future && rate > 0 && (
          <circle cx="22" cy="22" r="19" pathLength="100" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" strokeDasharray={`${rate} 100`} className="text-primary transition-all duration-300 motion-reduce:transition-none" filter={`url(#rg-${day})`} />
        )}
      </svg>
      <span className={`absolute inset-0 grid place-items-center text-[11px] font-semibold tabular-nums leading-none transition-colors duration-200 motion-reduce:transition-none ${showRate ? "text-primary" : future ? "text-muted-foreground/50" : rate > 0 ? "text-foreground" : "text-muted-foreground"}`}>
        <span key={showRate ? "rate" : "day"} className="animate-fade-in">{showRate ? `${rate}%` : day}</span>
      </span>
    </Button>
  );
}

const weekdayLabels = ["S", "T", "Q", "Q", "S", "S", "D"];
const dayFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });

// Segunda-feira da semana de `now`, deslocada por `weekOffset` semanas.
function mondayOf(now: Date, weekOffset: number) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + weekOffset * 7);
  return d;
}

function weekDays(habits: Habit[], now: Date, weekOffset: number) {
  const monday = mondayOf(now, weekOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const future = date > now;
    return { date, future, rate: future ? 0 : rateBetween(habits, date, date).rate };
  });
}

function WeekDaysRow({ days }: { days: ReturnType<typeof weekDays> }) {
  return <div className="grid grid-cols-7 gap-1.5">
    {days.map((day) => <DayRing key={iso(day.date)} day={day.date.getDate()} rate={day.rate} future={day.future} />)}
  </div>;
}

// Filtro "Esta semana": uma única linha com os 7 dias (seg-dom) da semana,
// com setas para navegar entre semanas.
function WeekStrip({ habits, now, weekOffset, onOffset }: { habits: Habit[]; now: Date; weekOffset: number; onOffset: (offset: number) => void }) {
  const days = weekDays(habits, now, weekOffset);
  const previousDays = weekDays(habits, now, weekOffset - 1);
  const nextDays = weekOffset < 0 ? weekDays(habits, now, weekOffset + 1) : null;
  const viewportRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef({ startX: 0, startY: 0, axis: "" as "" | "x" | "y", moved: false });
  const pendingOffsetRef = useRef<number | null>(null);
  const dragXRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const label = `${dayFmt.format(days[0]!.date)} – ${dayFmt.format(days[6]!.date)}`;

  const finishGesture = () => {
    const width = viewportRef.current?.clientWidth ?? 0;
    const threshold = Math.min(72, width * 0.2);
    const currentDragX = dragXRef.current;
    const direction = currentDragX > threshold ? -1 : currentDragX < -threshold && weekOffset < 0 ? 1 : 0;
    if (!direction || !width) {
      if (Math.abs(currentDragX) < 2) {
        dragXRef.current = 0;
        setDragX(0);
        return;
      }
      setAnimating(true);
      dragXRef.current = 0;
      setDragX(0);
      pendingOffsetRef.current = null;
      return;
    }
    pendingOffsetRef.current = weekOffset + direction;
    setAnimating(true);
    dragXRef.current = direction < 0 ? width : -width;
    setDragX(dragXRef.current);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (animating) return;
    gestureRef.current = { startX: event.clientX, startY: event.clientY, axis: "", moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId) || animating) return;
    const dx = event.clientX - gestureRef.current.startX;
    const dy = event.clientY - gestureRef.current.startY;
    if (!gestureRef.current.axis && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) gestureRef.current.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (gestureRef.current.axis !== "x") return;
    gestureRef.current.moved = Math.abs(dx) > 8;
    const resistance = (weekOffset >= 0 && dx < 0) ? 0.18 : 1;
    dragXRef.current = dx * resistance;
    setDragX(dragXRef.current);
  };

  const onTransitionEnd = (event: ReactTransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
    const nextOffset = pendingOffsetRef.current;
    if (nextOffset !== null) onOffset(nextOffset);
    pendingOffsetRef.current = null;
    setAnimating(false);
    dragXRef.current = 0;
    setDragX(0);
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="size-8 rounded-full" aria-label="Semana anterior" onClick={() => onOffset(weekOffset - 1)}><ChevronLeft className="size-4" /></Button>
        <p className="text-xs font-medium capitalize text-muted-foreground">{label}</p>
        <Button variant="ghost" size="icon" className="size-8 rounded-full" aria-label="Próxima semana" disabled={weekOffset >= 0} onClick={() => onOffset(weekOffset + 1)}><ChevronRight className="size-4" /></Button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-[9px] font-medium text-muted-foreground" aria-hidden="true">
        {weekdayLabels.map((labelText, i) => <span key={`${labelText}-${i}`}>{labelText}</span>)}
      </div>
      <div
        ref={viewportRef}
        className="relative mt-0 overflow-hidden py-2 [touch-action:pan-y]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={finishGesture}
        onClickCapture={(event) => { if (gestureRef.current.moved) { event.preventDefault(); event.stopPropagation(); gestureRef.current.moved = false; } }}
        role="group"
        aria-label={`Consistência da semana de ${label}: ${days.map((d) => `dia ${d.date.getDate()}, ${d.rate}%`).join("; ")}`}
      >
        <div
          className={`flex w-[300%] ${animating ? "transition-transform duration-[250ms] ease-out motion-reduce:transition-none" : ""}`}
          style={{ transform: `translate3d(calc(-33.333333% + ${dragX}px), 0, 0)` }}
          onTransitionEnd={onTransitionEnd}
        >
           <div className="w-1/3 shrink-0 px-2 opacity-70"><WeekDaysRow days={previousDays} /></div>
           <div className="w-1/3 shrink-0 px-2"><WeekDaysRow days={days} /></div>
           <div className="w-1/3 shrink-0 px-2 opacity-70">{nextDays ? <WeekDaysRow days={nextDays} /> : <div className="h-11" />}</div>
        </div>
        <span className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-background to-transparent" aria-hidden="true" />
        <span className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-background to-transparent" aria-hidden="true" />
      </div>
    </div>
  );
}

// Filtro "Este mês": grade do mês inteiro, 7 colunas (segunda a domingo),
// com setas para navegar entre meses.
function MonthGrid({ habits, now, monthOffset, onOffset }: { habits: Habit[]; now: Date; monthOffset: number; onOffset: (offset: number) => void }) {
  const year = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1).getFullYear();
  const month = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1).getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = new Date(year, month, day, 12);
    const future = date > now;
    return { day, future, rate: future ? 0 : rateBetween(habits, date, date).rate };
  });
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month, 1));
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="size-8 rounded-full" aria-label="Mês anterior" onClick={() => onOffset(monthOffset - 1)}><ChevronLeft className="size-4" /></Button>
        <p className="text-xs font-medium capitalize text-muted-foreground">{label}</p>
        <Button variant="ghost" size="icon" className="size-8 rounded-full" aria-label="Próximo mês" disabled={monthOffset >= 0} onClick={() => onOffset(monthOffset + 1)}><ChevronRight className="size-4" /></Button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-[9px] font-medium text-muted-foreground" aria-hidden="true">
        {weekdayLabels.map((labelText, i) => <span key={`${labelText}-${i}`}>{labelText}</span>)}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5" role="img" aria-label={`Consistência diária de ${label}: ${days.map((d) => `dia ${d.day}, ${d.rate}%`).join("; ")}`}>
        {Array.from({ length: leading }, (_, i) => <span key={`blank-${i}`} aria-hidden="true" />)}
        {days.map((day) => <DayRing key={day.day} day={day.day} rate={day.rate} future={day.future} />)}
      </div>
    </div>
  );
}

function StatCard({ title, value, unit, unitLabel, sub, diff, diffUnit, label }: { title: string; value: string; unit?: string; unitLabel?: string; sub?: string; diff: number; diffUnit: string; label: string | null }) {
  const TrendIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const tone = diff > 0 ? "text-primary" : diff < 0 ? "text-destructive" : "text-muted-foreground";
  return (
    <article className="paint-safe flex min-h-[128px] flex-col rounded-[22px] border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="mt-1.5 text-3xl font-semibold leading-none">{value}{unit ? <span className="text-lg text-primary">{unit}</span> : null}{unitLabel ? <span className="ml-1 text-sm font-normal text-muted-foreground">{unitLabel}</span> : null}</p>
      {sub ? <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p> : null}
      {label ? (
        <p className="mt-auto flex flex-wrap items-center gap-x-1 gap-y-0.5 pt-2 text-[11px]">
          <TrendIcon className={`size-3.5 shrink-0 ${tone}`} />
          <span className={tone}>{diff > 0 ? "+" : ""}{diff}{diffUnit}</span>
          <span className="text-muted-foreground">vs {label}</span>
        </p>
      ) : null}
    </article>
  );
}

function ProgressPage() {
  const [period, setPeriod] = useState<Period>("Esta semana");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const { habits, today } = useRitmo();
  // Meio-dia local na data do servidor: o relógio do aparelho não altera o período.
  const now = new Date(`${today}T12:00:00`);
  const { start, end } = rangeFor(period, now);
  const { rate, done, total } = rateBetween(habits, start, end);
  const previousRange = period === "Total" ? null : rangeFor(period, now, 1);
  const prevRate = previousRange ? rateBetween(habits, previousRange.start, previousRange.end).rate : null;
  const prevBest = previousRange ? bestStreakInRange(habits, previousRange.start, previousRange.end) : null;
  const rateDiff = prevRate !== null ? rate - prevRate : 0;
  const bestStreak = bestStreakInRange(habits, start, end);
  const bestDiff = prevBest !== null ? bestStreak - prevBest : 0;
  const prevLabel = previousLabel(period, now);
  const max = Math.max(0, ...habits.map((h) => h.best));

  const onShare = async () => {
    haptic(15);
    const result = await shareAchievement({
      title: period === "Total" ? "Meu progresso" : period,
      rate,
      streak: bestStreak,
      subtitle: `${done} de ${total} hábitos concluídos`,
    });
    if (result === "downloaded") toast.success("Imagem salva no seu dispositivo.");
    if (result === "error") toast.error("Não foi possível gerar a imagem.");
  };

  return <><PageHeader eyebrow="Visão geral" title="Seu progresso" action={
    <Button variant="ghost" size="icon" aria-label="Compartilhar conquista" onClick={() => { void onShare(); }} className="size-10 shrink-0 rounded-full text-muted-foreground hover:text-foreground"><Share2 className="size-5" /></Button>
  } />
  <div className="mt-6 flex gap-1 overflow-x-auto rounded-2xl bg-secondary p-1" role="tablist" aria-label="Período">{periods.map((item) => <Button key={item} onClick={() => { setPeriod(item); setWeekOffset(0); setMonthOffset(0); }} variant="ghost" aria-pressed={period === item} className={`shrink-0 flex-1 rounded-xl text-xs ${period === item ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>{item}</Button>)}</div>
  <section className="mt-6 grid grid-cols-2 gap-3">
    <StatCard title="Consistência" value={`${rate}`} unit="%" sub={`${done} de ${total} hábitos`} diff={rateDiff} diffUnit="%" label={prevLabel} />
    <StatCard title="Melhor sequência" value={`${bestStreak}`} unitLabel="dias" diff={bestDiff} diffUnit="" label={prevLabel} />
  </section>
  {period === "Esta semana" ? <section className="mt-6">
    <h2 className="mb-1 text-lg font-semibold">Consistência por dia</h2>
    <WeekStrip habits={habits} now={now} weekOffset={weekOffset} onOffset={setWeekOffset} />
  </section> : null}
  {period === "Este mês" ? <section className="mt-6">
    <h2 className="mb-1 text-lg font-semibold">Consistência por dia</h2>
    <MonthGrid habits={habits} now={now} monthOffset={monthOffset} onOffset={setMonthOffset} />
  </section> : null}
  <section className="mt-6"><div className="mb-3"><p className="text-sm text-muted-foreground">Conquistas</p><h2 className="text-xl font-semibold">Marcos de sequência</h2></div><div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{[7,14,30,60,90,365].map((mark) => { const achieved = max >= mark; return <div key={mark} className={`rounded-2xl border p-3 text-center ${achieved ? "border-primary/30 bg-success-muted" : "border-border bg-card"}`}>{achieved ? <Check className="mx-auto size-4 text-primary" /> : <LockKeyhole className="mx-auto size-4 text-muted-foreground" />}<p className="mt-2 font-semibold">{mark}</p><p className="text-[10px] text-muted-foreground">dias</p></div>; })}</div></section></>;
}
