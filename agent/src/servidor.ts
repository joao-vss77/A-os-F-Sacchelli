import { createServer, type IncomingMessage, type Server } from "node:http";
import type { Config } from "./config.js";
import type { Nuvem } from "./nuvem.js";
import { parseEventoIntelbras } from "./parser.js";

export type Log = (msg: string, extra?: unknown) => void;
const LIMITE_CORPO = 5 * 1024 * 1024;

function lerCorpo(req: IncomingMessage): Promise<Buffer> {
  return new Promise((res, rej) => {
    const partes: Buffer[] = [];
    let total = 0;
    req.on("data", (c: Buffer) => {
      total += c.length;
      if (total > LIMITE_CORPO) { req.destroy(); rej(new Error("corpo muito grande")); } else partes.push(c);
    });
    req.on("end", () => res(Buffer.concat(partes)));
    req.on("error", rej);
  });
}

/**
 * Servidor HTTP na rede local para o Modo Online do equipamento Intelbras:
 *  - POST {caminhoEventos}: o equipamento identificou alguém e espera {id, auth, message, code}
 *  - GET  .../keepalive: o equipamento verifica se o servidor está no ar
 * A resposta sai SEMPRE antes do tempo limite: se a nuvem não decidir a tempo, nega (ou libera,
 * se LIBERAR_EM_FALHA=true) e registra FALHA_COMUNICACAO.
 */
export function criarServidor(cfg: Config, nuvem: Nuvem, log: Log): Server {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://agente");
    const json = (status: number, corpo: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(corpo));
    };

    if (req.method === "GET" && /keepalive\/?$/i.test(url.pathname)) return json(200, { code: "200", message: "ok" });
    if (req.method === "GET" && url.pathname === "/saude") return json(200, { ok: true, dispositivo: cfg.dispositivoId });

    const caminho = cfg.caminhoEventos.replace(/\/+$/, "");
    if (req.method !== "POST" || !(url.pathname === caminho || url.pathname.startsWith(`${caminho}/`))) return json(404, { erro: "rota não encontrada" });

    let corpo: Buffer;
    try { corpo = await lerCorpo(req); } catch { return json(413, { code: "413", auth: "false", message: "Evento inválido" }); }
    const ev = parseEventoIntelbras(corpo, String(req.headers["content-type"] ?? ""));
    const id = ev.idEvento ?? "1";
    log(`evento recebido: usuário=${ev.userId ?? "não identificado"} método=${ev.metodo}`);

    try {
      // prazo garantido aqui, independente do cliente HTTP: o equipamento não pode ficar esperando
      let relogio: NodeJS.Timeout | undefined;
      const prazo = new Promise<never>((_, rej) => { relogio = setTimeout(() => rej(new Error(`nuvem não respondeu em ${cfg.timeoutNuvemMs} ms`)), cfg.timeoutNuvemMs); });
      const d = await Promise.race([
        nuvem.decidir({ userId: ev.userId, metodo: ev.metodo, sentido: ev.sentido, bruto: ev.bruto }, cfg.timeoutNuvemMs),
        prazo,
      ]).finally(() => clearTimeout(relogio));
      log(`decisão: ${d.permitido ? "LIBERADO" : "NEGADO"} — ${d.mensagem}`);
      return json(200, { id, auth: d.permitido ? "true" : "false", message: d.mensagem, code: "200" });
    } catch (e) {
      const erro = (e as Error).message;
      log(`falha ao consultar a nuvem: ${erro}`);
      nuvem.evento("FALHA_COMUNICACAO", { erro, userId: ev.userId, metodo: ev.metodo }, false).catch(() => {});
      return json(200, { id, auth: cfg.liberarEmFalha ? "true" : "false", message: "Falha de comunicação — procure a portaria", code: "200" });
    }
  });
}
