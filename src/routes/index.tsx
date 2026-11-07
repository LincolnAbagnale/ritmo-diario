import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Flame } from "lucide-react";
import { HabitDetails } from "@/features/ritmo/habit-details";
import { HabitRow, PageHeader } from "@/features/ritmo/ui";
import { isScheduledOn } from "@/features/ritmo/schedule";
import { useMembership } from "@/features/ritmo/membership";
import { useRitmo, type Habit } from "@/features/ritmo/store";
import { fireConfetti, haptic } from "@/lib/confetti";
import { PullToRefresh } from "@/features/ritmo/pull-to-refresh";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Hoje — Ritmo" }, { name: "description", content: "Acompanhe seus hábitos de hoje e mantenha sua sequência no Ritmo." },
    { property: "og:title", content: "Hoje — Ritmo" }, { property: "og:description", content: "Acompanhe seus hábitos de hoje e mantenha sua sequência no Ritmo." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: TodayPage,
});

function TodayPage() {
  const { habits, toggleToday, today, refresh } = useRitmo();
  const membership = useMembership();
  const displayName =
    membership?.nickname?.trim() || membership?.fullName?.trim().split(/\s+/)[0] || "você";
  const [selected, setSelected] = useState<Habit>();
  // Meio-dia local na data do servidor: evita que UTC vire o dia antes da meia-noite de Brasília.
  const todayDate = useMemo(() => new Date(`${today}T12:00:00`), [today]);
  const active = habits.filter((habit) => habit.active && isScheduledOn(habit, todayDate));
  const done = active.filter((habit) => habit.completions.includes(today)).length;
  const percentage = active.length ? Math.round(done / active.length * 100) : 0;
  const handleToggle = (habit: Habit) => {
    haptic(15); // vibração tátil ao marcar
    const completing = !habit.completions.includes(today);
    toggleToday(habit.id);
    // Confete ao completar 100% do dia.
    if (completing && done + 1 === active.length && active.length > 0) {
      haptic(40);
      setTimeout(fireConfetti, 120);
    }
  };
  const maxStreak = Math.max(0, ...habits.map((habit) => habit.streak));
  const date = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(todayDate);
  const days = useMemo(() => {
    const labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const now = todayDate;
    const todayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - todayIndex);

    return labels.map((label, index) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);
      const dateKey = day.toISOString().slice(0, 10);
      const isToday = index === todayIndex;
      // Considera apenas hábitos ativos agendados para esse dia da semana.
      const scheduled = habits.filter((habit) => habit.active && isScheduledOn(habit, day));
      const completed = scheduled.filter((habit) => habit.completions.includes(dateKey)).length;
      return {
        label,
        isToday,
        percentage: scheduled.length ? Math.round((completed / scheduled.length) * 100) : 0,
      };
    });
  }, [habits, todayDate]);
  return <PullToRefresh onRefresh={async () => { refresh(); await new Promise((resolve) => setTimeout(resolve, 400)); }}>
    <PageHeader title={`Olá, ${displayName}`} action={<span className="self-end pb-1 text-sm text-muted-foreground">{date}</span>} />
    <section className="mt-8">
      <article className="paint-safe rounded-[24px] border border-border bg-card p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase text-muted-foreground">Sequência</p><p className="mt-1 flex items-center gap-2 text-3xl font-semibold"><Flame className="size-7 fill-primary text-primary" />{maxStreak} <span className="text-base text-muted-foreground">dias</span></p></div><span className="text-xs text-muted-foreground">esta semana</span></div><div className="mt-7 grid grid-cols-7 gap-1 sm:gap-2">{days.map((day) => <DayProgressRing key={day.label} {...day} />)}</div></article>
    </section>
    <section className="mt-8"><div className="mb-4 flex items-end justify-between"><div><p className="text-sm text-muted-foreground">Seu ritmo</p><h2 className="text-xl font-semibold">Hábitos de hoje</h2></div><span className="text-sm text-muted-foreground">{done}/{active.length}</span></div><div className="space-y-2.5">{active.map((habit) => <HabitRow key={habit.id} habit={habit} today={today} onToggle={() => handleToggle(habit)} onOpen={() => setSelected(habit)} />)}</div></section>
    <section className="mt-7 grid grid-cols-3 gap-2"><Pill value={`${percentage}%`} label="concluídos" /><Pill value={`${maxStreak}`} label="maior sequência" /><Pill value={`${active.length}`} label="hábitos hoje" /></section>
    <HabitDetails habit={selected} open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(undefined); }} />
  </PullToRefresh>;
}
function DayProgressRing({ label, percentage, isToday }: { label: string; percentage: number; isToday: boolean }) { return <div className="min-w-0 text-center"><div className={`relative mx-auto size-10 sm:size-11 ${isToday ? "drop-shadow-[0_0_7px_var(--primary)]" : ""}`} aria-label={`${label}: ${percentage}% concluído`}><svg viewBox="0 0 44 44" className="size-full -rotate-90"><circle cx="22" cy="22" r="17" pathLength="100" fill="none" stroke="currentColor" strokeWidth="4" className="text-secondary" /><circle cx="22" cy="22" r="17" pathLength="100" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="4" strokeDasharray={`${percentage} 100`} className="text-primary transition-all duration-500 ease-out" /></svg><span className={`absolute inset-0 grid place-items-center text-[9px] font-semibold ${percentage > 0 ? "text-primary" : "text-muted-foreground"}`}>{percentage === 100 ? "✓" : percentage}</span></div><span className={`mt-2 block text-[10px] ${isToday ? "font-medium text-foreground" : "text-muted-foreground"}`}>{label}</span></div>; }
function Pill({ value, label }: { value: string; label: string }) { return <div className="paint-safe min-w-0 rounded-2xl bg-secondary p-3 text-center"><p className="font-semibold text-primary">{value}</p><p className="truncate text-[10px] text-muted-foreground sm:text-xs">{label}</p></div>; }
