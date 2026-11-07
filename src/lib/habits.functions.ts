import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireApproved } from "@/lib/auth-middleware";

/** Fuso oficial do app: a virada do dia acontece à meia-noite de Brasília. */
const TIMEZONE = "America/Sao_Paulo";

/** Data "de hoje" calculada no servidor, imune ao relógio do aparelho. */
const serverToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());

export const getServerToday = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ today: string }> => ({ today: serverToday() }),
);

export type HabitRecord = {
  id: string;
  name: string;
  icon: string;
  group: string;
  frequency: string;
  days: number[];
  monthDays: number[];
  time: string | null;
  goal: string | null;
  active: boolean;
  streak: number;
  best: number;
  completions: string[];
};

type HabitRow = {
  id: string;
  name: string;
  icon: string;
  group_name: string;
  frequency: string;
  days: string;
  month_days: string;
  time: string | null;
  goal: string | null;
  active: number;
  streak: number;
  best: number;
  completions: string;
};

const parseList = <T,>(value: string): T[] => {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const toRecord = (row: HabitRow): HabitRecord => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  group: row.group_name,
  frequency: row.frequency,
  days: parseList<number>(row.days),
  monthDays: parseList<number>(row.month_days),
  time: row.time,
  goal: row.goal,
  active: Boolean(row.active),
  streak: row.streak,
  best: row.best,
  completions: parseList<string>(row.completions).map((d) => String(d).slice(0, 10)),
});

const habitFields = z.object({
  name: z.string().trim().min(1).max(120),
  icon: z.string().max(20),
  group: z.string().max(40),
  frequency: z.string().max(120),
  days: z.array(z.number().int().min(0).max(6)).max(7),
  monthDays: z.array(z.number().int().min(1).max(31)).max(31).optional().default([]),
  time: z.string().max(20).nullish(),
  goal: z.string().max(200).nullish(),
});

const dateList = z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).max(5000);

export const listHabits = createServerFn({ method: "GET" })
  .middleware([requireApproved])
  .handler(async ({ context }): Promise<HabitRecord[]> => {
    const { results } = await context.db
      .prepare("SELECT * FROM habits WHERE user_id = ? ORDER BY created_at ASC")
      .bind(context.user.id)
      .all<HabitRow>();
    return results.map(toRecord);
  });

export const createHabit = createServerFn({ method: "POST" })
  .middleware([requireApproved])
  .inputValidator((data: unknown) => habitFields.parse(data))
  .handler(async ({ context, data }): Promise<HabitRecord> => {
    const id = crypto.randomUUID();
    await context.db
      .prepare(
        `INSERT INTO habits (id, user_id, name, icon, group_name, frequency, days, month_days, time, goal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        context.user.id,
        data.name,
        data.icon,
        data.group,
        data.frequency,
        JSON.stringify(data.days),
        JSON.stringify(data.monthDays),
        data.time ?? null,
        data.goal ?? null,
      )
      .run();
    const row = await context.db.prepare("SELECT * FROM habits WHERE id = ?").bind(id).first<HabitRow>();
    return toRecord(row!);
  });

export const updateHabit = createServerFn({ method: "POST" })
  .middleware([requireApproved])
  .inputValidator((data: unknown) => habitFields.extend({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const result = await context.db
      .prepare(
        `UPDATE habits SET name = ?, icon = ?, group_name = ?, frequency = ?, days = ?, month_days = ?,
                time = ?, goal = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE id = ? AND user_id = ?`,
      )
      .bind(
        data.name,
        data.icon,
        data.group,
        data.frequency,
        JSON.stringify(data.days),
        JSON.stringify(data.monthDays),
        data.time ?? null,
        data.goal ?? null,
        data.id,
        context.user.id,
      )
      .run();
    if (!result.meta.changes) throw new Error("Hábito não encontrado");
    return { ok: true };
  });

export const setHabitActive = createServerFn({ method: "POST" })
  .middleware([requireApproved])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(data))
  .handler(async ({ context, data }) => {
    const result = await context.db
      .prepare(
        "UPDATE habits SET active = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND user_id = ?",
      )
      .bind(data.active ? 1 : 0, data.id, context.user.id)
      .run();
    if (!result.meta.changes) throw new Error("Hábito não encontrado");
    return { ok: true };
  });

/** Apaga um hábito de forma definitiva e confirma que a linha sumiu. */
export const deleteHabitPermanently = createServerFn({ method: "POST" })
  .middleware([requireApproved])
  .inputValidator((data: unknown) => z.object({ habitId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await context.db
      .prepare("DELETE FROM habits WHERE id = ? AND user_id = ?")
      .bind(data.habitId, context.user.id)
      .run();
    const still = await context.db.prepare("SELECT 1 FROM habits WHERE id = ?").bind(data.habitId).first();
    if (still) throw new Error("O hábito não pôde ser apagado");
    return { deleted: true as const };
  });

export const toggleHabitCompletion = createServerFn({ method: "POST" })
  .middleware([requireApproved])
  .inputValidator((data: unknown) => z.object({ habitId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const today = serverToday();
    const habit = await context.db
      .prepare("SELECT completions, streak, best FROM habits WHERE id = ? AND user_id = ?")
      .bind(data.habitId, context.user.id)
      .first<{ completions: string; streak: number; best: number }>();
    if (!habit) throw new Error("Hábito não encontrado");

    const completions = parseList<string>(habit.completions).map((d) => String(d).slice(0, 10));
    const completed = completions.includes(today);
    const nextCompletions = completed ? completions.filter((d) => d !== today) : [...completions, today];
    const streak = Math.max(0, (habit.streak ?? 0) + (completed ? -1 : 1));
    const best = completed ? (habit.best ?? 0) : Math.max(habit.best ?? 0, streak);

    await context.db
      .prepare(
        `UPDATE habits SET completions = ?, streak = ?, best = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE id = ? AND user_id = ?`,
      )
      .bind(JSON.stringify(nextCompletions), streak, best, data.habitId, context.user.id)
      .run();

    return { today, completed: !completed, completions: nextCompletions, streak, best };
  });

/** Substitui todos os hábitos da conta pelos do backup. */
export const importHabits = createServerFn({ method: "POST" })
  .middleware([requireApproved])
  .inputValidator((data: unknown) =>
    z
      .object({
        habits: z
          .array(
            habitFields.extend({
              active: z.boolean().optional().default(true),
              streak: z.number().int().min(0).optional().default(0),
              best: z.number().int().min(0).optional().default(0),
              completions: dateList.optional().default([]),
            }),
          )
          .max(500),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<HabitRecord[]> => {
    const db = context.db;
    const userId = context.user.id;
    await db.batch([
      db.prepare("DELETE FROM habits WHERE user_id = ?").bind(userId),
      ...data.habits.map((habit, index) =>
        db
          .prepare(
            `INSERT INTO habits (id, user_id, name, icon, group_name, frequency, days, month_days, time, goal,
                                 active, streak, best, completions, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            userId,
            habit.name,
            habit.icon,
            habit.group,
            habit.frequency,
            JSON.stringify(habit.days),
            JSON.stringify(habit.monthDays),
            habit.time ?? null,
            habit.goal ?? null,
            habit.active ? 1 : 0,
            habit.streak,
            habit.best,
            JSON.stringify(habit.completions.map((d) => d.slice(0, 10))),
            // Mantém a ordem original do backup.
            new Date(Date.now() + index).toISOString(),
          ),
      ),
    ]);
    const { results } = await db
      .prepare("SELECT * FROM habits WHERE user_id = ? ORDER BY created_at ASC")
      .bind(userId)
      .all<HabitRow>();
    return results.map(toRecord);
  });

export const resetHabits = createServerFn({ method: "POST" })
  .middleware([requireApproved])
  .handler(async ({ context }) => {
    await context.db.prepare("DELETE FROM habits WHERE user_id = ?").bind(context.user.id).run();
    return { ok: true };
  });
