import type { Habit } from "@/features/ritmo/store";

/** Um hábito está agendado para a data? Mensais usam dias do mês; os demais, dias da semana. */
export function isScheduledOn(habit: Habit, date: Date) {
  if (habit.monthDays && habit.monthDays.length) {
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    // Dia 30/31 em meses curtos cai no último dia do mês.
    return habit.monthDays.some((day) => Math.min(day, last) === date.getDate());
  }
  if (habit.group === "Mensais") return false;
  return habit.days.includes(date.getDay());
}
