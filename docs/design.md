# Sistema de Portaria Aços F Sacchelli — Design da implementação

Data: 2026-11-17 · Base: `entregaveis/Documentacao_Tecnica_Sistema_Portaria_Sacchelli.pdf` (regras RN01–RN10, DER, sequências).

## 1. Intenção
Sistema funcional para apresentar na ENIAC: cadastro de visitantes e visitas, autorização com validade, **entrada por reconhecimento facial e por digital** em equipamento Intelbras real (já disponível para teste), saída, contingência manual, histórico, relatórios, usuários/perfis e auditoria. Visual idêntico à identidade da Aços F Sacchelli; painel inspirado (sem copiar) no InControl Web.

**Sucesso:** na apresentação, uma pessoa é cadastrada (dados + face/digital), passa no equipamento, o sistema decide e o evento aparece no painel em segundos; uma pessoa sem autorização é negada com motivo.

**Não objetivos:** controle de ponto, aprovação da visita pelo anfitrião, leitura de placas, multiempresa.
**Anti-objetivos:** regra de acesso dentro do equipamento ou de código Intelbras; demo que quebra se o aparelho falhar.

## 2. Restrições
- Hospedagem gratuita: **Vercel (Hobby)** + **Supabase (Free)**. Não criar nada nas contas: entregar `docs/DEPLOY.md` com o passo a passo.
- Equipamento Intelbras (linha Bio-T) com modelo/firmware ainda desconhecidos.
- API Intelbras: CGI sobre HTTP com Digest; Modo Online (evento → resposta `{auth, message}`; keepalive; fallback offline por timeout). Endpoints de face confirmados (`AccessFace.cgi?action=insertMulti`, base64); usuário (`AccessUser.cgi?action=insertMulti`); digital remota **não confirmada** para terminais faciais.

## 3. Abordagens consideradas
| | Abordagem | Trocas |
|---|---|---|
| **A (escolhida)** | Web + API na Vercel, banco/Auth no Supabase, **agente local** na LAN fala com o equipamento | + funciona com qualquer firmware com API; + cadastro facial/digital pelo sistema; + simulador para demo. − uma peça a instalar |
| B | Equipamento chama a Vercel direto (Online 2.0/HTTPS) | Depende do firmware; cold start pode estourar o timeout; sem cadastro remoto |
| C | Tudo simulado | Não cumpre o uso real de face/digital |

Escolhida pelo usuário: **A**.

## 4. Arquitetura
```
Navegador (PC portaria) ──HTTPS──► Next.js (Vercel) ──► Supabase (Postgres + Auth + Realtime)
                                        ▲  /api/agente/*  (token do agente)
Agente local (Node, LAN) ──HTTPS saída──┘
   ▲ POST /notification, GET /keepalive (Modo Online)        │ CGI Digest (cadastro usuário/face/digital, abrir porta)
   └──────────────── Equipamento Intelbras ◄─────────────────┘
```
- **Regras de negócio** (TypeScript puro, `packages/core`): `avaliarAcesso`, validação de CPF/placa, vigência de autorização. Usadas pela API; testadas com Vitest.
- **API** (Next.js route handlers / server actions): CRUD, decisão, fila de comandos, relatórios.
- **Agente** (`agent/`): servidor HTTP na LAN para o Modo Online; repassa o evento a `POST /api/agente/decisao` e responde ao aparelho; consome a fila `comando_dispositivo` (polling 2 s) e executa via `IntelbrasBioTAdapter` (CGI Digest) ou `SimuladorAdapter`. Grava payload bruto em `evento_dispositivo` para calibrar com o aparelho real.
- **Timeout:** o agente responde ao aparelho dentro do prazo configurado; se a nuvem não responder, nega e registra `FALHA_COMUNICACAO` (configurável para deixar o aparelho decidir offline).

## 5. Dados
DER do PDF implementado como migrations SQL do Supabase (nomes iguais). Acréscimos justificados:
- `comando_dispositivo` (fila agente): tipo (CADASTRAR_USUARIO, CADASTRAR_FACE, CAPTURAR_DIGITAL, REMOVER_USUARIO, ABRIR_PORTA), payload, situação, tentativas, erro. **A foto da face fica só no payload até ser sincronizada e depois é apagada** (alternativa A de biometria do PDF).
- `IDENTIFICACAO_FACIAL` → generalizada para `identificacao_biometrica` com coluna `tipo` (FACIAL | DIGITAL), pois agora há duas credenciais.
- `usuario` vinculado a `auth.users` do Supabase. RLS por perfil (PORTEIRO, GESTOR, ADMIN).

## 6. Telas (Next.js + Tailwind, pt-BR)
Login · **Painel** (indicadores: presentes agora, visitas hoje, negados hoje, dispositivos online; gráfico de eventos por hora liberado/negado/falha; feed em tempo real) · **Cadastro de visitante** (layout da interface anexada: CPF com busca, CEP via ViaCEP, motivo, pessoa/setor, placa, aviso LGPD; captura de face pela webcam ou pelo equipamento; captura de digital no equipamento) · Visitantes (lista, detalhe, autorizações, biometrias, bloquear/revogar) · Portaria (alertas, presentes, registro manual entrada/saída) · Histórico (filtros, CSV) · Relatórios · Configurações (usuários, setores, motivos, funcionários, dispositivos) · **Simulador** (equipamento virtual para a demo).
Identidade: azul-marinho, amarelo e verde do logo Sacchelli; logo e fonte oficiais **pendentes** (uso uma recriação em SVG até receber o arquivo).

## 7. Decisões do construtor (calls minhas)
Next.js 14 App Router + TypeScript + Tailwind + Recharts; Supabase JS; monorepo npm workspaces; Vitest; agente em Node 20 com `undici` + Digest próprio; saída por registro manual e pelo equipamento com sentido SAIDA (pendência do PDF resolvida aceitando ambos); autorização padrão do visitante: até 23:59 do dia.

## 8. Pendente do usuário (não bloqueia o início)
Modelo/firmware do equipamento; arquivo oficial do logo e fontes; confirmação dos campos do evento do aparelho (calibrados no teste).
