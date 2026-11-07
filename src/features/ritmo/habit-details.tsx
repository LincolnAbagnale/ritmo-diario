import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Flame, Trophy, X } from "lucide-react";
import type { Habit } from "@/features/ritmo/store";
import { HabitGlyph } from "./ui";

export function HabitDetails({ habit, open, onOpenChange }: { habit: Habit | undefined; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!habit) return null;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month, i + 1);
    date.setHours(12, 0, 0, 0);
    return {
      date,
      done: habit.completions.includes(date.toISOString().slice(0, 10)),
    };
  });
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(now);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md rounded-[24px] border-border bg-popover p-0 text-popover-foreground sm:rounded-[24px] [&>:last-child]:hidden">
    <div className="p-5"><DialogHeader className="flex-row items-center gap-3 space-y-0"><div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent text-primary"><HabitGlyph icon={habit.icon} /></div><div className="min-w-0 flex-1"><DialogTitle className="truncate text-xl leading-tight">{habit.name}</DialogTitle><DialogDescription>{habit.frequency}{habit.goal ? ` · ${habit.goal}` : ""}</DialogDescription></div><DialogClose className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"><X className="size-4" /></DialogClose></DialogHeader>
      <div className="mt-6 grid grid-cols-3 gap-2"><Metric value={`${habit.streak}`} label="sequência" icon={<Flame className="size-4" />} /><Metric value={`${habit.best}`} label="recorde" icon={<Trophy className="size-4" />} /><Metric value={`${habit.completionRate}%`} label="conclusão" /></div>
      <div className="mt-7"><div className="mb-3 flex items-center justify-between"><h3 className="font-medium capitalize">{monthLabel}</h3><span className="text-xs text-muted-foreground">atividade</span></div><div className="grid grid-cols-7 gap-x-1.5 gap-y-2.5 sm:gap-x-2">{cells.map(({ date, done }) => <ActivityDay key={date.toISOString()} date={date} done={done} />)}</div></div>
    </div>
  </DialogContent></Dialog>;
}
function ActivityDay({ date, done }: { date: Date; done: boolean }) {
  const label = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(date);
  return <div className="relative mx-auto size-10" role="img" aria-label={`${label}: ${done ? "concluído" : "não concluído"}`}>
    <svg viewBox="0 0 40 40" className="size-full -rotate-90" aria-hidden="true">
      <circle cx="20" cy="20" r="18" pathLength="100" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-border" />
      {done && <circle cx="20" cy="20" r="18" pathLength="100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="100 100" className="text-primary transition-all duration-200" />}
    </svg>
    <span className="absolute inset-0 grid place-items-center">
      <span className={`grid size-[26px] place-items-center rounded-full text-[11px] font-medium tabular-nums ${done ? "bg-primary/15 text-primary" : "bg-secondary text-foreground"}`}>{date.getDate()}</span>
    </span>
  </div>;
}
function Metric({ value, label, icon }: { value: string; label: string; icon?: React.ReactNode }) { return <div className="rounded-2xl bg-secondary p-3 text-center"><div className="flex items-center justify-center gap-1.5 text-lg font-semibold leading-none">{icon && <span className="translate-y-[1px]">{icon}</span>}<span className="tabular-nums">{value}</span></div><p className="mt-1.5 text-[11px] text-muted-foreground">{label}</p></div>; }
