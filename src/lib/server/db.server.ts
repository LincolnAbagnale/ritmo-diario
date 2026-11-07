// Acesso ao banco D1 e funções de segurança. Só roda no servidor (Worker da Cloudflare).
import { deleteCookie, getCookie, getRequestHeader, setCookie } from "@tanstack/react-start/server";

/** Tipos mínimos do D1 (evita depender de @cloudflare/workers-types). */
export type D1Result<T> = { results: T[]; meta: { changes: number } };
export type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  all: <T = Record<string, unknown>>() => Promise<D1Result<T>>;
  run: () => Promise<D1Result<never>>;
};
export type D1Database = {
  prepare: (query: string) => D1PreparedStatement;
  batch: (statements: D1PreparedStatement[]) => Promise<unknown[]>;
};

export function getDB(): D1Database {
  // O Nitro guarda os bindings do Worker em globalThis.__env__ a cada requisição.
  const env = (globalThis as { __env__?: { DB?: D1Database } }).__env__;
  const db = env?.DB;
  if (!db) throw new Error("Banco D1 não configurado (binding DB). Veja o DEPLOY.md.");
  return db;
}

/** Conta dona do app: entra sempre aprovada e como administradora. */
export const OWNER_EMAIL = "lsmlincolnmoraes@gmail.com";

const SESSION_COOKIE = "ritmo_sessao";
const SESSION_DAYS = 30;
// O Workers aceita no máximo 100 mil iterações de PBKDF2.
const PBKDF2_ITERATIONS = 100_000;

const encoder = new TextEncoder();
const toB64 = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromB64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
const toB64Url = (bytes: Uint8Array) => toB64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iterations, salt, expected] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterations || !salt || !expected) return false;
  const actual = new Uint8Array(await pbkdf2(password, fromB64(salt), Number(iterations)));
  const wanted = fromB64(expected);
  if (actual.length !== wanted.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i]! ^ wanted[i]!;
  return diff === 0;
}

async function sha256(value: string) {
  return toB64(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

export async function createSession(userId: string) {
  const token = toB64Url(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = Date.now() + SESSION_DAYS * 86_400_000;
  const db = getDB();
  await db.batch([
    db.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(Date.now()),
    db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
      .bind(await sha256(token), userId, expiresAt),
  ]);
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function destroySession() {
  const token = getCookie(SESSION_COOKIE);
  if (token) await getDB().prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  deleteCookie(SESSION_COOKIE, { path: "/" });
}

export type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  nickname: string | null;
  phone: string | null;
  approved: number;
  is_admin: number;
};

export async function getSessionUser(): Promise<UserRow | null> {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;
  return getDB()
    .prepare(
      `SELECT u.id, u.email, u.full_name, u.nickname, u.phone, u.approved, u.is_admin
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .bind(await sha256(token), Date.now())
    .first<UserRow>();
}

export function clientIp() {
  return getRequestHeader("cf-connecting-ip") ?? "local";
}
