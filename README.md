# Ritmo Diário

App de hábitos diários: marque o que fez hoje, acompanhe sequências e veja o progresso por semana e mês. Funciona como PWA (instala no celular e abre offline).

- **Front e servidor:** TanStack Start + React + Tailwind, rodando como Worker na Cloudflare.
- **Banco:** Cloudflare D1 (`migrations/`).
- **Login:** e-mail e senha próprios (hash PBKDF2, sessão em cookie HttpOnly). Novas contas aguardam aprovação de um administrador na aba **Membros**.

Publicar e atualizar: veja [DEPLOY.md](DEPLOY.md).

Origem: cópia independente do projeto `pulso-pessoal`, criado no Lovable.
