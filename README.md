# Sistema de Portaria — Aços F Sacchelli

Controle de entrada e saída com **reconhecimento facial e digital** em equipamento Intelbras.
Implementa as regras do documento técnico (`docs/design.md`): o equipamento **identifica** a pessoa; o sistema **autoriza**.

## Estrutura
| Pasta | O que é |
|---|---|
| `apps/web` | Site + API (Next.js) — publicado na **Vercel** |
| `supabase` | Banco de dados (migrations SQL, RLS, seed) — **Supabase** |
| `packages/core` | Regras de negócio puras (decisão de acesso, CPF, fuso) |
| `agent` | Agente local que fala com o equipamento Intelbras (Modo Online + API CGI) |
| `docs` | Design, guia de publicação, agente e pendências |

## Funcionalidades
- Cadastro de visitante (busca por CPF, CEP automático) e registro de visita com autorização até 23:59.
- Biometria: face pela webcam ou digital no equipamento, com base legal LGPD.
- Entrada/saída automática pelo equipamento, registro manual de contingência e equipamento virtual (simulador).
- Painel em tempo real, pessoas presentes, alertas, histórico com exportação CSV, relatórios.
- Usuários com perfis (Porteiro, Gestor, Administrador), auditoria automática e RLS no banco.

## Comandos
```bash
npm install            # instala tudo (workspaces)
npm test               # valida SQL (Postgres em memória) + testes do core, web e agente
npm run dev -w apps/web
npm run build -w agent && npm start -w agent
```

## Documentação
- [Como publicar (Supabase + Vercel)](docs/DEPLOY.md)
- [Agente local e configuração do equipamento](docs/AGENTE.md)
- [O que falta para ficar 100%](docs/PENDENCIAS.md)
- [Design da implementação](docs/design.md)
