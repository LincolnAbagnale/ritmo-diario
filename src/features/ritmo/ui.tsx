import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Bell, BookOpen, Check, ChevronRight, CircleUserRound, Droplets, Flame, Footprints, HeartPulse, Home, ListChecks, Moon, Settings, SlidersHorizontal, Sun, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import type { Habit, HabitIcon } from "@/features/ritmo/store";
import { useMembership } from "./membership";

const iconMap: Record<HabitIcon, LucideIcon> = { sun: Sun, book: BookOpen, walk: Footprints, water: Droplets, moon: Moon, heart: HeartPulse };
export const HabitGlyph = ({ icon, className = "size-5" }: { icon: HabitIcon; className?: string }) => { const Icon = iconMap[icon]; return <Icon className={className} />; };

const navItems = [
  { label: "Hoje", to: "/", icon: Home },
  { label: "Hábitos", to: "/habitos", icon: ListChecks },
  { label: "Progresso", to: "/progresso", icon: BarChart3 },
  { label: "Ajustes", to: "/ajustes", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const membership = useMembership();
  const items = membership?.isAdmin
    ? [...navItems, { label: "Membros", to: "/membros", icon: Users } as const]
    : [...navItems];
  return <div className="min-h-dvh bg-background text-foreground">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-sidebar px-5 py-7 md:flex md:flex-col">
      <Link to="/" className="flex items-center gap-3 px-2 text-xl font-semibold"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Check className="size-5 stroke-[3]" /></span>Ritmo</Link>
      <nav className="mt-12 space-y-1">{items.map((item) => { const active = path === item.to; return <Link key={item.to} to={item.to} className={`flex h-12 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}><item.icon className={`size-5 ${active ? "text-primary" : ""}`} /><span>{item.label}</span></Link>; })}</nav>
      <div className="mt-auto flex items-center gap-3 border-t border-border pt-5"><div className="grid size-9 place-items-center rounded-full bg-accent"><CircleUserRound className="size-5" /></div><div><p className="text-sm font-medium">Lincoln</p><p className="text-xs text-muted-foreground">Seu ritmo, seus dados</p></div></div>
    </aside>
    <main className="mx-auto min-h-dvh max-w-5xl px-5 pb-28 pt-8 md:ml-64 md:px-10 md:pb-12 md:pt-12">{children}</main>
    <nav className={`fixed inset-x-3 bottom-3 z-40 grid ${items.length > 4 ? "grid-cols-5" : "grid-cols-4"} rounded-[22px] border border-border bg-nav/95 p-1.5 shadow-nav backdrop-blur-xl md:hidden`}>{items.map((item) => { const active = path === item.to; return <Link key={item.to} to={item.to} aria-label={item.label} className={`flex h-14 flex-col items-center justify-center gap-1 rounded-[16px] text-[11px] transition-colors ${active ? "bg-accent text-foreground" : "text-muted-foreground"}`}><item.icon className={`size-5 ${active ? "text-primary" : ""}`} /><span>{item.label}</span></Link>; })}</nav>
  </div>;
}

export function PageHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4"><div className="min-w-0">{eyebrow && <p className="mb-1 text-sm text-muted-foreground">{eyebrow}</p>}<h1 className="truncate text-[clamp(1.85rem,5vw,2.6rem)] font-semibold tracking-normal">{title}</h1></div>{action}</header>;
}

// `today` vem do servidor: o relógio do aparelho não altera a marcação nem a animação.
export function HabitRow({ habit, today, onToggle, onOpen }: { habit: Habit; today: string; onToggle: () => void; onOpen: () => void }) {
  const complete = habit.completions.includes(today);
  return <div className={`paint-safe grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[20px] border p-3.5 transition-all duration-200 ${complete ? "border-success/20 bg-success-muted" : "border-border bg-card"}`}>
    <Button onClick={onToggle} size="icon" variant="ghost" aria-label={complete ? `Desmarcar ${habit.name}` : `Concluir ${habit.name}`} className={`paint-safe size-11 shrink-0 overflow-hidden rounded-full border transition-all duration-200 active:scale-90 ${complete ? "scale-100 border-primary bg-primary text-primary-foreground hover:bg-primary/90" : "border-border bg-secondary text-muted-foreground hover:text-primary"}`}>{complete ? <Check className="size-5 stroke-[3] animate-check-in" /> : <HabitGlyph icon={habit.icon} />}</Button>
    <button onClick={onOpen} className="min-w-0 text-left"><p className={`truncate font-medium transition-colors ${complete ? "text-muted-foreground" : "text-foreground"}`}>{habit.name}</p><p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Flame className="size-3.5 text-primary" /> {habit.streak} dias · {habit.time ?? habit.goal ?? habit.frequency}</p></button>
    <Button onClick={onOpen} size="icon" variant="ghost" aria-label={`Detalhes de ${habit.name}`} className="size-9 shrink-0 rounded-full text-muted-foreground"><ChevronRight className="size-4" /></Button>
  </div>;
}

export { Bell, Check, ChevronRight, Flame, SlidersHorizontal };
