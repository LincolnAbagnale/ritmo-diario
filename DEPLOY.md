# Publicar o Ritmo Diário na Cloudflare

O app roda como **Worker** na Cloudflare, com os dados no banco **D1**. Tudo cabe no plano gratuito.

## Primeira publicação

```
npm install
npx wrangler login
npx wrangler d1 create ritmo
```

Copie o `database_id` mostrado e cole no `wrangler.jsonc` (no lugar de `00000000-...`).

```
npm run db:remoto
npm run deploy
```

No final aparece o endereço, algo como `https://ritmo-diario.<sua-conta>.workers.dev`.

## Primeiro acesso

1. Abra o endereço e toque em **Criar agora**.
2. Crie a conta com o e-mail do dono (`lsmlincolnmoraes@gmail.com`, definido em `src/lib/server/db.server.ts`). Ela entra já aprovada e como administradora.
3. Outras pessoas criam conta e ficam em **Aguardando aprovação** até você aprovar em **Membros**.

## Trazer os hábitos da versão do Lovable

1. No app antigo, vá em **Ajustes → Exportar backup** e salve o arquivo.
2. No app novo, vá em **Ajustes → Restaurar backup** e escolha o arquivo.

## Atualizar depois de mudanças

```
npm run deploy
```

Se surgir um arquivo novo em `migrations/`, rode `npm run db:remoto` antes.

## Testar no computador

```
npm run cf:dev
```

Abre em http://localhost:8787 com um banco D1 de teste, só local.

## Segurança

- Senhas guardadas só como hash PBKDF2 (100 mil iterações, SHA-256).
- Sessão em cookie `HttpOnly`, `Secure`, `SameSite=Lax`, válida por 30 dias; sair apaga a sessão no banco.
- 5 senhas erradas bloqueiam o IP por 15 minutos.
- Suspender um membro derruba as sessões dele na hora.
- As server functions têm proteção CSRF do TanStack Start.
