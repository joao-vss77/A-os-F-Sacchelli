# O que falta para ficar 100%

O sistema, o banco, a API, o simulador e o agente estão prontos e testados sem o equipamento.
Estes itens dependem de você ou do equipamento físico.

## Com o equipamento em mãos (prioridade)
| # | Item | Por quê | Onde ajustar |
|---|---|---|---|
| 1 | Informar **modelo e firmware** | API CGI e Modo Online dependem da versão | — |
| 2 | Capturar **um evento real** do Modo Online | confirmar os nomes dos campos (UserID, método face/digital, sentido) | `agent/src/parser.ts` (o evento bruto fica salvo em `evento_dispositivo`) |
| 3 | Testar **cadastro de usuário** (`AccessUser.cgi insertMulti`) | campos obrigatórios variam por firmware | `agent/src/adapters/intelbrasBioT.ts` |
| 4 | Testar **cadastro de face** (`AccessFace.cgi insertMulti`, base64) | confirmar formato de `PhotoData` e tamanho máximo da foto | idem |
| 5 | Verificar **captura remota de digital** | não confirmada para terminais faciais; hoje o sistema orienta cadastrar a digital no aparelho com o código da pessoa | `capturarDigital` no adaptador |
| 6 | Validar **remoção de usuário**, **abrir porta** e **teste de disponibilidade** | seguem o padrão CGI da família, ainda sem teste | adaptador |
| 7 | Medir o **tempo de resposta** nuvem → equipamento | definir `TIMEOUT_NUVEM_MS` e o timeout do aparelho | `.env` do agente |
| 8 | Confirmar se o equipamento informa **entrada ou saída** | hoje, com um único aparelho, o sistema alterna entrada/saída pelo último movimento | `parser.ts` / sentido do dispositivo |

## Identidade visual
| # | Item | Situação atual |
|---|---|---|
| 9 | Arquivo oficial do **logo** (SVG ou PNG alta resolução) | recriação em `apps/web/components/Logo.tsx` |
| 10 | **Fontes e cores oficiais** da marca | provisórias: Montserrat (títulos) + Inter (texto); cores tiradas do logo |

## Contas e publicação (siga `docs/DEPLOY.md`)
| # | Item |
|---|---|
| 11 | Criar o projeto no Supabase e rodar as migrations + seed |
| 12 | Criar o primeiro administrador |
| 13 | Publicar na Vercel com as 4 variáveis de ambiente |
| 14 | Instalar o agente no PC da rede (`docs/AGENTE.md`) |

## Decisões de negócio ainda abertas (do documento técnico)
| # | Item | Como está hoje |
|---|---|---|
| 15 | Base legal da biometria (com o DPO) | o porteiro escolhe entre consentimento e prevenção à fraude; consentimento exige marcação |
| 16 | Prazo de retenção dos dados | sem exclusão automática; remoção manual da biometria na ficha |
| 17 | Validade da autorização do visitante | até 23:59 do dia da visita |
| 18 | Saída pode ser bloqueada? | não: saída sempre liberada e registrada |
