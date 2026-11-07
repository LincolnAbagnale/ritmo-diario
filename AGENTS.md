# Ritmo Diário

App de hábitos (TanStack Start + React) publicado como Worker na Cloudflare, com banco D1 e login próprio.
Esta é uma cópia independente do projeto que nasceu no Lovable; ela **não** sincroniza com o Lovable.

- Servidor: `src/lib/*.functions.ts` (server functions) e `src/lib/server/db.server.ts` (D1, senhas, sessões).
- O código de `src/lib/server/` só pode ser importado dinamicamente dentro de handlers/middlewares (`src/lib/auth-middleware.ts`).
- Banco: migrações em `migrations/` (`npm run db:remoto` antes do deploy quando houver migração nova).
- Deploy: `npm run deploy`. Guia completo em `DEPLOY.md`.
