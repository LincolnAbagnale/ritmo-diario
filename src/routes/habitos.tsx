import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HabitDetails } from "@/features/ritmo/habit-details";
import { SwipeRow } from "@/features/ritmo/swipe-row";
import { HabitGlyph, PageHeader } from "@/features/ritmo/ui";
import { useRitmo, type Habit, type HabitGroup, type HabitIcon } from "@/features/ritmo/store";
import { toast } from "sonner";

export const Route = createFileRoute("/habitos")({
  head: () => ({
    meta: [
      { title: "Hábitos — Ritmo" },
      {
        name: "description",
        content: "Organize hábitos diários, semanais e personalizados no Ritmo.",
      },
      { property: "og:title", content: "Hábitos — Ritmo" },
      {
        property: "og:description",
        content: "Organize hábitos diários, semanais e personalizados no Ritmo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HabitsPage,
});

type HabitDraft = {
  name: string;
  icon: HabitIcon;
  group: HabitGroup;
  frequency: string;
  days: number[];
  monthDays?: number[];
  time?: string;
  goal?: string;
};

function HabitsPage() {
  const { habits, toggleActive, createHabit, updateHabit, deleteHabit } = useRitmo();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Habit>();
  const [selected, setSelected] = useState<Habit>();
  const handleDelete = (habit: Habit) => {
    deleteHabit(habit.id);
    toast.error(`"${habit.name}" apagado`, {
      description: "O hábito e todo o histórico foram removidos.",
      action: {
        label: "Desfazer",
        onClick: () =>
          createHabit({
            name: habit.name,
            icon: habit.icon,
            group: habit.group,
            frequency: habit.frequency,
            days: habit.days,
            ...(habit.monthDays ? { monthDays: habit.monthDays } : {}),
            ...(habit.time ? { time: habit.time } : {}),
            ...(habit.goal ? { goal: habit.goal } : {}),
          }),
      },
    });
  };
  const groups: HabitGroup[] = ["Diários", "Semanais", "Mensais", "Personalizados"];
  return (
    <>
      <PageHeader
        eyebrow={`${habits.filter((h) => h.active).length} ativos`}
        title="Seus hábitos"
        action={
          <Button onClick={() => setCreating(true)} className="rounded-full">
            <Plus className="size-4" /> <span className="hidden sm:inline">Criar hábito</span>
          </Button>
        }
      />
      <div className="mt-8 space-y-8">
        {groups.map((group) => {
          const list = habits.filter((h) => h.group === group);
          if (!list.length) return null;
          return (
            <section key={group}>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">{group}</h2>
              <div className="space-y-2.5">
                {list.map((habit) => (
                  <SwipeRow
                    key={habit.id}
                    onDelete={() => handleDelete(habit)}
                    onEdit={() => setEditing(habit)}
                  >
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[20px] border border-border bg-card p-4">
                      <button
                        onClick={() => setSelected(habit)}
                        className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary"
                      >
                        <HabitGlyph icon={habit.icon} />
                      </button>
                      <button onClick={() => setSelected(habit)} className="min-w-0 text-left">
                        <p className="truncate font-medium">{habit.name}</p>
                        <div className="mt-1.5">
                          <FrequencyChips habit={habit} />
                        </div>
                      </button>
                      <Switch
                        checked={habit.active}
                        onCheckedChange={() => toggleActive(habit.id)}
                        aria-label={`Ativar ${habit.name}`}
                      />
                    </div>
                  </SwipeRow>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <HabitForm
        open={creating || Boolean(editing)}
        habit={editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(undefined);
          }
        }}
        onSave={(draft) => {
          if (editing) {
            updateHabit(editing.id, draft);
            toast.success(`"${draft.name}" atualizado`);
            setEditing(undefined);
          } else {
            createHabit(draft);
            setCreating(false);
          }
        }}
      />
      <HabitDetails
        habit={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(undefined);
        }}
      />
    </>
  );
}

const dayChips = [
  { n: 1, l: "S" },
  { n: 2, l: "T" },
  { n: 3, l: "Q" },
  { n: 4, l: "Q" },
  { n: 5, l: "S" },
  { n: 6, l: "S" },
  { n: 0, l: "D" },
];

function FrequencyChips({ habit }: { habit: Habit }) {
  if (habit.group === "Mensais") {
    const dates = habit.monthDays ?? [];
    return (
      <div className="flex flex-wrap gap-1">
        {dates.length ? (
          dates
            .slice()
            .sort((a, b) => a - b)
            .map((day) => (
              <span
                key={day}
                className="inline-flex items-center rounded-md border border-success/30 bg-success-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary"
              >
                dia {day}
              </span>
            ))
        ) : (
          <span className="inline-flex items-center rounded-md border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Sem data escolhida
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="flex gap-1">
      {dayChips.map((day) => {
        const on = habit.days.includes(day.n);
        return (
          <span
            key={day.n}
            className={`grid size-6 place-items-center rounded-md text-[10px] font-medium tabular-nums ${
              on
                ? "border border-success/30 bg-success-muted text-primary"
                : "border border-border bg-secondary text-muted-foreground"
            }`}
          >
            {day.l}
          </span>
        );
      })}
    </div>
  );
}

function HabitForm({
  open,
  onOpenChange,
  onSave,
  habit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (habit: HabitDraft) => void;
  habit?: Habit | undefined;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<HabitIcon>("heart");
  const [group, setGroup] = useState<HabitGroup>("Diários");
  const [time, setTime] = useState("");
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState([1, 2, 3, 4, 5, 6, 0]);
  const [monthDays, setMonthDays] = useState<number[]>([]);
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setName(habit?.name ?? "");
    setIcon(habit?.icon ?? "heart");
    setGroup(habit?.group ?? "Diários");
    setTime(habit?.time ?? "");
    setGoal(habit?.goal ?? "");
    setDays(habit?.days ?? [1, 2, 3, 4, 5, 6, 0]);
    setMonthDays(habit?.monthDays ?? []);
  }, [open, habit]);
  const dayOptions = [
    { n: 1, l: "S" },
    { n: 2, l: "T" },
    { n: 3, l: "Q" },
    { n: 4, l: "Q" },
    { n: 5, l: "S" },
    { n: 6, l: "S" },
    { n: 0, l: "D" },
  ];
  const frequencyLabel =
    group === "Diários"
      ? "Todos os dias"
      : group === "Mensais"
        ? `${monthDays.length || 1}x por mês`
        : `${days.length}x por semana`;
  const title = habit ? "Editar hábito" : "Criar hábito";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[24px] border-border bg-popover text-popover-foreground sm:rounded-[24px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Etapa {step} de 2 · apenas o essencial.</DialogDescription>
        </DialogHeader>
        {step === 1 ? (
          <div className="space-y-5">
            <div>
              <Label htmlFor="habit-name">Nome</Label>
              <Input
                id="habit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Alongar por 10 minutos"
                className="mt-2 h-12 rounded-xl bg-secondary"
              />
            </div>
            <div>
              <Label>Ícone</Label>
              <div className="mt-2 flex gap-2">
                {(["heart", "sun", "book", "walk", "water", "moon"] as HabitIcon[]).map((item) => (
                  <Button
                    key={item}
                    onClick={() => setIcon(item)}
                    size="icon"
                    variant={icon === item ? "default" : "secondary"}
                    className="rounded-full"
                  >
                    <HabitGlyph icon={item} />
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Frequência</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["Diários", "Semanais", "Mensais", "Personalizados"] as HabitGroup[]).map(
                  (item) => (
                    <Button
                      key={item}
                      onClick={() => setGroup(item)}
                      variant={group === item ? "default" : "secondary"}
                      className="h-11 rounded-xl px-2 text-xs"
                    >
                      {item}
                    </Button>
                  ),
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {group === "Mensais" ? (
              <div>
                <Label>Dias do mês</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Escolha até 3 datas. O hábito só aparece em Hoje nessas datas.
                </p>
                <div className="mt-2 grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => {
                    const on = monthDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          setMonthDays((current) =>
                            current.includes(day)
                              ? current.filter((n) => n !== day)
                              : current.length >= 3
                                ? current
                                : [...current, day],
                          )
                        }
                        className={`grid h-9 place-items-center rounded-lg text-xs font-medium tabular-nums transition-colors duration-150 ${
                          on
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <Label>Dias da semana</Label>
                <div className="mt-2 flex justify-between gap-1">
                  {dayOptions.map((day) => (
                    <Button
                      key={day.n}
                      onClick={() =>
                        setDays((current) =>
                          current.includes(day.n)
                            ? current.filter((n) => n !== day.n)
                            : [...current, day.n],
                        )
                      }
                      size="icon"
                      variant={days.includes(day.n) ? "default" : "secondary"}
                      className="size-10 shrink-0 rounded-full"
                    >
                      {day.l}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 items-start gap-3">
              <div className="flex min-w-0 flex-col">
                <Label htmlFor="habit-time" className="block h-5 truncate leading-5">
                  Horário opcional
                </Label>
                <Input
                  id="habit-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-2 h-12 w-full min-w-0 appearance-none rounded-xl bg-secondary"
                />
              </div>
              <div className="flex min-w-0 flex-col">
                <Label htmlFor="habit-goal" className="block h-5 truncate leading-5">
                  Meta opcional
                </Label>
                <Input
                  id="habit-goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="30 min"
                  className="mt-2 h-12 w-full min-w-0 rounded-xl bg-secondary"
                />
              </div>
            </div>
          </div>
        )}
        <div className="mt-3 flex justify-end gap-2">
          {step === 2 && (
            <Button variant="secondary" onClick={() => setStep(1)} className="rounded-full">
              Voltar
            </Button>
          )}
          <Button
            disabled={!name.trim() || (step === 2 && group === "Mensais" && !monthDays.length)}
            onClick={() =>
              step === 1
                ? setStep(2)
                : onSave({
                    name: name.trim(),
                    icon,
                    group,
                    frequency: frequencyLabel,
                    days,
                    monthDays: group === "Mensais" ? monthDays : [],
                    ...(time ? { time } : {}),
                    ...(goal ? { goal } : {}),
                  })
            }
            className="rounded-full"
          >
            {step === 1 ? "Continuar" : habit ? "Salvar alterações" : "Criar hábito"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
