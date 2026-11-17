# Agente local — integração com o equipamento Intelbras

O agente é um pequeno programa que roda **num computador da rede da empresa** (pode ser o PC da portaria).
Ele é a única peça que conversa com o equipamento:

```
Equipamento Intelbras ──(Modo Online, rede local)──► Agente ──(HTTPS)──► Sistema na Vercel ──► Supabase
Equipamento Intelbras ◄──(API CGI com Digest)─────── Agente ◄──(fila de comandos)── cadastros de face/digital
```

- **Entrada/saída:** o equipamento reconhece a face ou a digital e pergunta ao agente se pode liberar. O agente pergunta ao sistema (que aplica as regras) e responde `auth: true/false` com uma mensagem para a tela do equipamento.
- **Cadastros:** quando o porteiro cadastra a face/digital no sistema, um comando entra na fila; o agente busca a fila a cada 2 s e envia ao equipamento.
- **Monitoramento:** a cada 30 s o agente informa se o equipamento responde (aparece em **Portaria → Equipamentos**).
- O agente **só faz conexões de saída** para a internet — não é preciso abrir portas no roteador.

## Requisitos
- Windows 10/11 (ou Linux) na mesma rede do equipamento.
- **Node.js 20.6 ou superior** (https://nodejs.org — versão LTS).

## Instalação
```powershell
cd portaria-sacchelli
npm install
npm run build -w agent
cd agent
copy .env.example .env
notepad .env
```
Preencha o `.env`:
| Variável | O que colocar |
|---|---|
| `NUVEM_URL` | endereço da Vercel (ex.: `https://portaria-sacchelli.vercel.app`) |
| `AGENTE_TOKEN` | o mesmo token configurado na Vercel |
| `DISPOSITIVO_ID` | identificador do dispositivo em **Configurações → Dispositivos** (o seed cria `portaria-01`) |
| `MODO` | `INTELBRAS_BIOT` (equipamento real) ou `SIMULADOR` |
| `EQUIP_HOST`, `EQUIP_PORTA` | IP e porta do equipamento na rede |
| `EQUIP_USUARIO`, `EQUIP_SENHA` | usuário e senha da interface web do equipamento |

Execute:
```powershell
npm start
```
A janela mostra: `Agente da portaria no ar — modo INTELBRAS_BIOT…`. Teste no navegador do próprio PC: `http://localhost:3080/saude`.

### Liberar a porta no Firewall do Windows
O equipamento precisa alcançar o agente na porta 3080 (rede local):
```powershell
New-NetFirewallRule -DisplayName "Agente Portaria" -Direction Inbound -Protocol TCP -LocalPort 3080 -Action Allow -Profile Private,Domain
```

### Deixar rodando sempre (opcional)
Use o **Agendador de Tarefas** do Windows: nova tarefa → disparar *Ao iniciar o computador* → ação *Iniciar programa* `node` com argumentos `--env-file=.env dist/main.js` e *Iniciar em* a pasta `agent`.

## Configurar o equipamento (Modo Online)
Na interface web do equipamento (acesse pelo IP no navegador):
1. Confirme o **firmware**: a API CGI e o Modo Online dependem da versão (veja a documentação do seu modelo).
2. Ative o **Modo Online** / **servidor de eventos** e informe:
   - **Endereço:** IP do PC onde o agente roda
   - **Porta:** `3080`
   - **Caminho de envio de eventos:** `/notification`
   - **Keep alive:** caminho `/keepalive` (em firmwares Online 2.0 o caminho pode ser fixo)
   - **Tempo limite da autenticação remota:** maior que `TIMEOUT_NUVEM_MS` (sugestão: 3000 ms com o agente em 1500 ms)
3. Os nomes exatos dos menus variam por modelo/firmware — **ponto a validar com o equipamento**.

> Referências oficiais: documentação da API Intelbras (Modo Online, Configurar via API, Cadastrar Faces) em
> `intelbras-caco-api.intelbras.com.br` e o Manual da Interface Web da linha Bio‑T.

## Usuários no equipamento
O sistema usa o **código no equipamento** (`codigo_dispositivo`, mostrado na ficha da pessoa, a partir de 1001) como `UserID` no aparelho.
Se a digital precisar ser cadastrada diretamente no aparelho, use esse mesmo código.

## Solução de problemas
| Sintoma | O que verificar |
|---|---|
| Equipamento nega todos com "Falha de comunicação" | internet do PC, `NUVEM_URL`, `AGENTE_TOKEN`, região da função na Vercel (gru1) |
| Dispositivo aparece "Indisponível" | IP/porta/usuário/senha do equipamento no `.env` |
| Cadastro de face fica "Sincronizando" | o agente está rodando? veja o log; erros aparecem na ficha da pessoa |
| "Pessoa não cadastrada" na passagem | o UserID do aparelho não corresponde ao código no sistema — recadastre a biometria pelo sistema |
| Formato do evento não reconhecido | os eventos brutos ficam em `evento_dispositivo.detalhe` (Supabase) para ajustar `agent/src/parser.ts` |
