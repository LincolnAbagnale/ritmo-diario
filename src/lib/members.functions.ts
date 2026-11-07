import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/lib/auth-middleware";
import type { UserRow } from "@/lib/server/db.server";

/** Carrega o código do banco só no servidor. */
const server = () => import("@/lib/server/db.server");

export type Membership = {
  email: string;
  approved: boolean;
  isAdmin: boolean;
  fullName: string | null;
  nickname: string | null;
  phone: string | null;
};

export type SessionInfo = { user: { id: string; email: string }; membership: Membership };

const toSession = (row: UserRow): SessionInfo => ({
  user: { id: row.id, email: row.email },
  membership: {
    email: row.email,
    approved: Boolean(row.approved),
    isAdmin: Boolean(row.is_admin),
    fullName: row.full_name,
    nickname: row.nickname,
    phone: row.phone,
  },
});

/** Sessão atual (cookie HttpOnly). `null` quando ninguém está logado. */
export const getCurrentSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionInfo | null> => {
    const { getSessionUser } = await server();
    const user = await getSessionUser();
    return user ? toSession(user) : null;
  },
);

const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(6).max(200),
});

const MAX_FAILURES = 5;
const BLOCK_MS = 15 * 60_000;

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => credentials.parse(data))
  .handler(async ({ data }): Promise<{ error: string } | SessionInfo> => {
    const { getDB, clientIp, verifyPassword, createSession } = await server();
    const db = getDB();
    const ip = clientIp();
    const attempt = await db
      .prepare("SELECT failures, blocked_until FROM login_attempts WHERE ip = ?")
      .bind(ip)
      .first<{ failures: number; blocked_until: number }>();
    if (attempt && attempt.blocked_until > Date.now()) {
      return { error: "Muitas tentativas. Espere 15 minutos e tente de novo." };
    }

    const row = await db
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(data.email)
      .first<UserRow & { password_hash: string }>();
    const ok = row ? await verifyPassword(data.password, row.password_hash) : false;

    if (!row || !ok) {
      const failures = (attempt?.failures ?? 0) + 1;
      const blocked = failures >= MAX_FAILURES;
      await db
        .prepare(
          `INSERT INTO login_attempts (ip, failures, blocked_until) VALUES (?, ?, ?)
           ON CONFLICT(ip) DO UPDATE SET failures = excluded.failures, blocked_until = excluded.blocked_until`,
        )
        .bind(ip, blocked ? 0 : failures, blocked ? Date.now() + BLOCK_MS : 0)
        .run();
      return { error: "E-mail ou senha incorretos." };
    }

    await db.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(ip).run();
    await createSession(row.id);
    return toSession(row);
  });

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => credentials.parse(data))
  .handler(async ({ data }): Promise<{ error: string } | SessionInfo> => {
    const { getDB, hashPassword, createSession, OWNER_EMAIL } = await server();
    const db = getDB();
    const exists = await db.prepare("SELECT 1 FROM users WHERE email = ?").bind(data.email).first();
    if (exists) return { error: "Já existe uma conta com esse e-mail." };

    // A conta dona entra aprovada e como administradora; as outras aguardam aprovação.
    const isOwner = data.email === OWNER_EMAIL;
    const id = crypto.randomUUID();
    await db
      .prepare("INSERT INTO users (id, email, password_hash, approved, is_admin) VALUES (?, ?, ?, ?, ?)")
      .bind(id, data.email, await hashPassword(data.password), isOwner ? 1 : 0, isOwner ? 1 : 0)
      .run();
    await createSession(id);
    const row = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
    return toSession(row!);
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { destroySession } = await server();
  await destroySession();
  return { ok: true };
});

const profileSchema = z.object({
  fullName: z.string().trim().min(3).max(80),
  nickname: z.string().trim().max(40).optional().default(""),
  phone: z
    .string()
    .trim()
    .max(25)
    .optional()
    .default("")
    .refine((v) => {
      const d = v.replace(/\D/g, "");
      // vazio = manter o telefone atual
      return d.length === 0 || (d.length >= 10 && d.length <= 13);
    }, "Telefone inválido"),
});

export const saveMyProfile = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((data: unknown) => profileSchema.parse(data))
  .handler(async ({ context, data }) => {
    await context.db
      .prepare("UPDATE users SET full_name = ?, nickname = ?, phone = COALESCE(?, phone) WHERE id = ?")
      .bind(data.fullName, data.nickname || null, data.phone || null, context.user.id)
      .run();
    return { ok: true };
  });

export type Member = { id: string; email: string; approved: boolean; isAdmin: boolean };

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<Member[]> => {
    const { results } = await context.db
      .prepare("SELECT id, email, approved, is_admin FROM users ORDER BY created_at ASC")
      .all<{ id: string; email: string; approved: number; is_admin: number }>();
    return results.map((r) => ({
      id: r.id,
      email: r.email,
      approved: Boolean(r.approved),
      isAdmin: Boolean(r.is_admin),
    }));
  });

const memberAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), id: z.string(), value: z.boolean() }),
  z.object({ action: z.literal("admin"), id: z.string(), value: z.boolean() }),
  z.object({ action: z.literal("remove"), id: z.string() }),
]);

export const updateMember = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) => memberAction.parse(data))
  .handler(async ({ context, data }) => {
    const { OWNER_EMAIL } = await server();
    const target = await context.db
      .prepare("SELECT email FROM users WHERE id = ?")
      .bind(data.id)
      .first<{ email: string }>();
    if (!target) throw new Error("Membro não encontrado");
    if (target.email === OWNER_EMAIL || data.id === context.user.id) {
      throw new Error("Não é possível alterar a própria conta nem a conta dona");
    }
    if (data.action === "remove") {
      await context.db.prepare("DELETE FROM users WHERE id = ?").bind(data.id).run();
    } else if (data.action === "approve") {
      await context.db.batch([
        context.db.prepare("UPDATE users SET approved = ? WHERE id = ?").bind(data.value ? 1 : 0, data.id),
        // Suspender derruba as sessões abertas da pessoa.
        ...(data.value ? [] : [context.db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(data.id)]),
      ]);
    } else {
      await context.db
        .prepare("UPDATE users SET is_admin = ? WHERE id = ?")
        .bind(data.value ? 1 : 0, data.id)
        .run();
    }
    return { ok: true };
  });
