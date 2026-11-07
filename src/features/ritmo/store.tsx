import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  createHabit as createHabitFn,
  deleteHabitPermanently,
  getServerToday,
  importHabits,
  listHabits,
  resetHabits,
  setHabitActive,
  toggleHabitCompletion,
  updateHabit as updateHabitFn,
  type HabitRecord,
} from "@/lib/habits.functions";
import { getCurrentSession, signOut as signOutFn, type SessionInfo } from "@/lib/members.functions";

export type HabitGroup = "Diários" | "Semanais" | "Mensais" | "Personalizados";
export type HabitIcon = "sun" | "book" | "walk" | "water" | "moon" | "heart";
export type Habit = {
  id: string;
  name: string;
  icon: HabitIcon;
  group: HabitGroup;
  frequency: string;
  days: number[];
  /** Dias do mês (1-31) para hábitos mensais. */
  monthDays?: number[];
  time?: string;
  goal?: string;
  active: boolean;
  streak: number;
  best: number;
  completionRate: number;
  completions: string[];
};

type Preferences = { weekStartsMonday: boolean; notifications: boolean };
export type NewHabit = Pick<Habit, "name" | "icon" | "group" | "frequency" | "days"> &
  Partial<Pick<Habit, "time" | "goal" | "monthDays">>;

type RitmoState = {
  habits: Habit[];
  preferences: Preferences;
  hydrated: boolean;
  session: SessionInfo | null;
  /** Atualiza a sessão depois de entrar, criar conta ou editar o perfil. */
  setSession: (session: SessionInfo | null) => void;
  /** Data de hoje segundo o servidor (fuso de Brasília) — não depende do relógio do aparelho. */
  today: string;
  signOut: () => Promise<void>;
  toggleToday: (id: string) => void;
  toggleActive: (id: string) => void;
  createHabit: (habit: NewHabit) => void;
  updateHabit: (id: string, habit: NewHabit) => void;
  deleteHabit: (id: string) => void;
  setPreferences: (preferences: Preferences) => void;
  importData: (data: string) => boolean;
  exportData: () => string;
  resetData: () => void;
  /** Recarrega os hábitos a partir do servidor (pull-to-refresh). */
  refresh: () => void;
};

const PREFS_KEY = "ritmo-prefs-v1";
const iso = (date: Date) => date.toISOString().slice(0, 10);
export const todayKey = () => iso(new Date());

const toHabit = (record: HabitRecord): Habit => ({
  id: record.id,
  name: record.name,
  icon: record.icon as HabitIcon,
  group: record.group as HabitGroup,
  frequency: record.frequency,
  days: record.days,
  monthDays: record.monthDays,
  ...(record.time ? { time: record.time } : {}),
  ...(record.goal ? { goal: record.goal } : {}),
  active: record.active,
  streak: record.streak,
  best: record.best,
  completionRate: 0,
  completions: record.completions,
});

const toFields = (habit: NewHabit) => ({
  name: habit.name,
  icon: habit.icon,
  group: habit.group,
  frequency: habit.frequency,
  days: habit.days,
  monthDays: habit.monthDays ?? [],
  time: habit.time ?? null,
  goal: habit.goal ?? null,
});

const RitmoContext = createContext<RitmoState | undefined>(undefined);

export function RitmoProvider({ children }: { children: ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [preferences, setPreferences] = useState<Preferences>({ weekStartsMonday: true, notifications: false });
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [today, setToday] = useState<string>(() => todayKey());

  // A data oficial vem do servidor: mexer no relógio do aparelho não altera "hoje".
  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      void getServerToday()
        .then(({ today: serverDate }) => { if (!cancelled) setToday(serverDate); })
        .catch(() => { /* Sem rede: mantém a última data conhecida. */ });
    };
    sync();
    const onVisible = () => { if (document.visibilityState === "visible") sync(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", sync);
    const interval = window.setInterval(sync, 60_000);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", sync);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) setPreferences(JSON.parse(raw) as Preferences);
    } catch { /* Mantém as preferências padrão. */ }
    void getCurrentSession()
      .then((current) => {
        setSession(current);
        if (!current) setHydrated(true);
      })
      .catch(() => setHydrated(true));
  }, []);

  const userId = session?.user.id;
  const approved = Boolean(session?.membership.approved);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!userId) {
      setHabits([]);
      return;
    }
    if (!approved) {
      setHydrated(true);
      return;
    }
    let cancelled = false;
    void listHabits()
      .then((records) => { if (!cancelled) setHabits(records.map(toHabit)); })
      .catch(() => { /* Sem rede: mantém a lista atual. */ })
      .finally(() => { if (!cancelled) setHydrated(true); });
    return () => { cancelled = true; };
  }, [userId, approved, refreshKey]);

  // Recarrega a lista real do servidor ao voltar ao app ou à internet.
  useEffect(() => {
    const refresh = () => setRefreshKey((key) => key + 1);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
    };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(preferences)); } catch { /* ignora */ }
  }, [preferences]);

  const value = useMemo<RitmoState>(() => ({
    habits,
    preferences,
    hydrated,
    session,
    setSession,
    today,
    refresh: () => setRefreshKey((key) => key + 1),
    signOut: async () => {
      try { await signOutFn(); } finally {
        setSession(null);
        setHabits([]);
      }
    },
    toggleToday: (id) => {
      const habit = habits.find((item) => item.id === id);
      if (!habit) return;
      const completed = habit.completions.includes(today);
      const optimistic: Habit = {
        ...habit,
        completions: completed ? habit.completions.filter((date) => date !== today) : [...habit.completions, today],
        streak: Math.max(0, habit.streak + (completed ? -1 : 1)),
        best: completed ? habit.best : Math.max(habit.best, habit.streak + 1),
      };
      setHabits((all) => all.map((item) => (item.id === id ? optimistic : item)));
      // O servidor decide a data real e grava; o relógio do aparelho não interfere.
      void toggleHabitCompletion({ data: { habitId: id } })
        .then((result) => {
          setToday(result.today);
          setHabits((all) => all.map((item) => (item.id === id
            ? { ...item, completions: result.completions, streak: result.streak, best: result.best }
            : item)));
        })
        .catch(() => {
          // Reverte se o servidor rejeitar (ex.: sem rede).
          setHabits((all) => all.map((item) => (item.id === id ? habit : item)));
        });
    },
    toggleActive: (id) => {
      const habit = habits.find((item) => item.id === id);
      if (!habit) return;
      setHabits((all) => all.map((item) => (item.id === id ? { ...item, active: !item.active } : item)));
      void setHabitActive({ data: { id, active: !habit.active } }).catch(() => {
        setHabits((all) => all.map((item) => (item.id === id ? habit : item)));
        toast.error("Não foi possível salvar. Verifique sua conexão.");
      });
    },
    createHabit: (habit) => {
      if (!userId) return;
      void createHabitFn({ data: toFields(habit) })
        .then((record) => setHabits((all) => [...all, toHabit(record)]))
        .catch(() => toast.error("Não foi possível criar o hábito. Verifique sua conexão."));
    },
    updateHabit: (id, habit) => {
      const previous = habits.find((item) => item.id === id);
      setHabits((all) => all.map((item) => (item.id === id ? { ...item, ...habit, monthDays: habit.monthDays ?? [] } : item)));
      void updateHabitFn({ data: { id, ...toFields(habit) } }).catch(() => {
        if (previous) setHabits((all) => all.map((item) => (item.id === id ? previous : item)));
        toast.error("Não foi possível salvar as alterações. Verifique sua conexão.");
      });
    },
    deleteHabit: (id) => {
      const previous = habits.find((item) => item.id === id);
      setHabits((all) => all.filter((habit) => habit.id !== id));
      // O servidor apaga e confirma que a linha sumiu; sem confirmação, o hábito volta na hora.
      void deleteHabitPermanently({ data: { habitId: id } })
        .then(() => { setRefreshKey((key) => key + 1); })
        .catch(() => {
          if (previous) setHabits((all) => (all.some((item) => item.id === id) ? all : [...all, previous]));
          toast.error("Não foi possível apagar o hábito. Verifique sua conexão e tente de novo.");
        });
    },
    setPreferences,
    exportData: () => JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), habits, preferences }, null, 2),
    importData: (data) => {
      try {
        const parsed = JSON.parse(data) as { habits?: Habit[]; preferences?: Preferences };
        if (!Array.isArray(parsed.habits) || !userId) return false;
        const rows = parsed.habits.map((habit) => ({
          ...toFields(habit),
          active: habit.active ?? true,
          streak: habit.streak ?? 0,
          best: habit.best ?? 0,
          completions: habit.completions ?? [],
        }));
        void importHabits({ data: { habits: rows } })
          .then((records) => setHabits(records.map(toHabit)))
          .catch(() => toast.error("Não foi possível restaurar o backup."));
        if (parsed.preferences) setPreferences(parsed.preferences);
        return true;
      } catch { return false; }
    },
    resetData: () => {
      if (!userId) return;
      setHabits([]);
      void resetHabits().catch(() => toast.error("Não foi possível apagar os dados."));
      setPreferences({ weekStartsMonday: true, notifications: false });
    },
  }), [habits, preferences, hydrated, session, userId, today]);

  return <RitmoContext.Provider value={value}>{children}</RitmoContext.Provider>;
}

export function useRitmo() {
  const context = useContext(RitmoContext);
  if (!context) throw new Error("useRitmo precisa estar dentro de RitmoProvider");
  return context;
}
