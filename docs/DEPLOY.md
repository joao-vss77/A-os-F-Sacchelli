# Como publicar: Supabase + Vercel (gratuito)

Este guia coloca o sistema no ar usando os planos gratuitos. Siga na ordem. Tempo estimado: 30 minutos.

> **Antes de começar:** o código precisa estar num repositório do GitHub (a Vercel publica a partir dele).
> Crie um repositório privado e envie esta pasta (`portaria-sacchelli`).

---

## Parte 1 — Supabase (banco de dados, login e tempo real)

### 1. Criar o projeto
1. Acesse https://supabase.com e entre com sua conta.
2. **New project** → escolha um nome (ex.: `portaria-sacchelli`).
3. **Region:** `South America (São Paulo)` — menor atraso para a portaria.
4. Defina uma senha forte para o banco e guarde-a. Clique em **Create new project** e aguarde.

### 2. Criar as tabelas
1. Menu lateral → **SQL Editor** → **New query**.
2. Cole e execute (**Run**), **um arquivo por vez e nesta ordem**:
   1. `supabase/migrations/0001_schema.sql`
   2. `supabase/migrations/0002_funcoes.sql`
   3. `supabase/migrations/0003_rls.sql`
   4. `supabase/seed.sql` (perfis, setores, motivos, dispositivos e 2 funcionários de exemplo)
3. Confira em **Table Editor** que as tabelas `pessoa`, `visita`, `registro_acesso` etc. existem.

### 3. Ativar o tempo real do painel
1. **Database → Publications → supabase_realtime**.
2. Verifique que `registro_acesso`, `dispositivo` e `comando_dispositivo` estão marcadas (a migração 0003 já tenta marcar; se não estiverem, marque manualmente).

### 4. Configurar o login
1. **Authentication → Sign In / Providers → Email**: deixe **ativado**.
2. **Authentication → Settings**: **desative "Allow new users to sign up"**. Só o administrador cria usuários, pela tela de Configurações.
3. Depois de publicar na Vercel (Parte 2), volte em **Authentication → URL Configuration** e coloque em **Site URL** o endereço da Vercel (ex.: `https://portaria-sacchelli.vercel.app`).

### 5. Criar o primeiro administrador
1. **Authentication → Users → Add user → Create new user**: informe e-mail e senha e marque **Auto Confirm User**.
2. No **SQL Editor**, rode (troque o e-mail):
   ```sql
   insert into usuario (id, perfil_id, nome, login)
   select u.id, (select id from perfil where nome = 'ADMIN'), 'Administrador', u.email
   from auth.users u where u.email = 'seu.email@empresa.com.br';
   ```
3. Os próximos usuários (porteiros, gestores) são criados dentro do sistema em **Configurações → Usuários**.

### 6. Copiar as chaves
Em **Project Settings → API** (ou **API Keys**), anote:
| Onde aparece | Variável no sistema |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` / publishable key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` / secret key | `SUPABASE_SERVICE_ROLE_KEY` (**secreta — nunca coloque no navegador nem no agente**) |

> **Plano gratuito:** projetos sem uso por 7 dias são pausados. Antes da apresentação, abra o painel do Supabase e confirme que o projeto está ativo (botão **Restore** se estiver pausado).

---

## Parte 2 — Vercel (site e API)

### 1. Gerar o token do agente
Gere um texto aleatório longo (mínimo 32 caracteres). No PowerShell:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```
Guarde: ele vai na Vercel (`AGENTE_TOKEN`) e no `.env` do agente.

### 2. Importar o projeto
1. Acesse https://vercel.com → **Add New → Project** → importe o repositório do GitHub.
2. **Root Directory:** `apps/web` (clique em *Edit* e selecione a pasta).
3. **Framework Preset:** Next.js (detectado automaticamente). Mantenha os comandos padrão.
4. Em **Environment Variables**, adicione:
   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon/publishable |
   | `SUPABASE_SERVICE_ROLE_KEY` | chave service_role/secret |
   | `AGENTE_TOKEN` | token gerado no passo 1 |
5. **Deploy**.

### 3. Ajustes recomendados
- **Settings → Functions → Function Region:** `São Paulo, Brazil (gru1)`. Reduz o tempo de resposta da decisão de acesso (o equipamento espera poucos segundos).
- Volte ao Supabase e preencha a **Site URL** (Parte 1, passo 4.3).

### 4. Testar
1. Abra o endereço da Vercel e entre com o administrador.
2. **Configurações → Usuários:** crie um porteiro.
3. **Visitantes → Novo visitante:** cadastre alguém (use a câmera do notebook para a face e o equipamento "Equipamento virtual").
4. **Simulador:** escolha a pessoa e clique em **Simular passagem** — o resultado aparece no **Início** em tempo real.

> **Plano Hobby da Vercel** é para uso pessoal/não comercial — adequado para a apresentação na ENIAC. Para uso definitivo pela empresa, avalie o plano Pro ou hospedar o site em outro provedor.

---

## Parte 3 — Agente local (equipamento Intelbras)
Veja [AGENTE.md](AGENTE.md).

## Variáveis de ambiente — resumo
| Variável | Onde | Secreta? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | não |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | não (protegida por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel | **sim** |
| `AGENTE_TOKEN` | Vercel + `.env` do agente | **sim** |
| `EQUIP_USUARIO` / `EQUIP_SENHA` | só `.env` do agente | **sim** |

Para rodar localmente: copie `apps/web/.env.example` para `apps/web/.env.local`, preencha e rode `npm install` e `npm run dev -w apps/web`.
