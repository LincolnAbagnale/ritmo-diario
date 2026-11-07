import { createMiddleware } from "@tanstack/react-start";

// O código do banco só é carregado no servidor (importação dinâmica dentro de .server()).

/** Exige sessão válida. */
export const requireUser = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { getDB, getSessionUser } = await import("@/lib/server/db.server");
  const user = await getSessionUser();
  if (!user) throw new Error("Não autenticado");
  return next({ context: { user, db: getDB() } });
});

/** Exige conta aprovada (quem aguarda aprovação não mexe em hábitos). */
export const requireApproved = createMiddleware({ type: "function" })
  .middleware([requireUser])
  .server(async ({ next, context }) => {
    if (!context.user.approved) throw new Error("Conta aguardando aprovação");
    return next();
  });

export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireApproved])
  .server(async ({ next, context }) => {
    if (!context.user.is_admin) throw new Error("Apenas administradores");
    return next();
  });
