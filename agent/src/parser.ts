/**
 * Tradução tolerante do evento enviado pelo equipamento Intelbras no Modo Online.
 * O formato exato depende do modelo/firmware (PONTO A VALIDAR com o equipamento):
 * aceita JSON, multipart (parte JSON + foto) e form-urlencoded, procurando as chaves
 * em qualquer nível. Nunca lança exceção.
 */
export type Metodo = "FACIAL" | "DIGITAL" | "OUTRO";

export interface EventoTraduzido {
  userId: string | null;
  metodo: Metodo;
  sentido?: "ENTRADA" | "SAIDA";
  idEvento: string | null;
  bruto: unknown;
}

const CHAVES_USUARIO = ["userid", "user_id", "personid", "employeeno"];
const CHAVES_METODO = ["method", "openmethod", "verifymode", "authtype", "credentialtype"];
const CHAVES_SENTIDO = ["type", "direction", "entryexit", "inout"];
const CHAVES_ID = ["eventid", "id", "recno", "sn"];

function procurar(obj: unknown, chaves: string[], prof = 0): unknown {
  if (!obj || typeof obj !== "object" || prof > 6) return undefined;
  if (Array.isArray(obj)) {
    for (const x of obj) { const r = procurar(x, chaves, prof + 1); if (r !== undefined) return r; }
    return undefined;
  }
  for (const [k, v] of Object.entries(obj)) if (chaves.includes(k.toLowerCase()) && (typeof v === "string" || typeof v === "number")) return v;
  for (const v of Object.values(obj)) { const r = procurar(v, chaves, prof + 1); if (r !== undefined) return r; }
  return undefined;
}

function tentarJson(t: string): unknown {
  try { return JSON.parse(t); } catch { return undefined; }
}

function partesMultipart(corpo: Buffer, contentType: string): unknown[] {
  const m = /boundary="?([^";]+)"?/i.exec(contentType);
  if (!m) return [];
  const texto = corpo.toString("latin1");
  const objetos: unknown[] = [];
  for (const parte of texto.split(`--${m[1]}`)) {
    const sep = parte.indexOf("\r\n\r\n");
    if (sep < 0) continue;
    const cab = parte.slice(0, sep).toLowerCase();
    if (cab.includes("image/")) continue; // fotos não interessam à decisão
    const conteudo = Buffer.from(parte.slice(sep + 4).replace(/\r\n$/, ""), "latin1").toString("utf8");
    const j = tentarJson(conteudo);
    if (j !== undefined) objetos.push(j);
    else {
      const nome = /name="([^"]+)"/.exec(cab)?.[1];
      if (nome) objetos.push({ [nome]: conteudo.trim() });
    }
  }
  return objetos;
}

export function mapearMetodo(v: unknown): Metodo {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("face")) return "FACIAL";
  if (s.includes("finger") || s.includes("digital") || s.includes("biometr")) return "DIGITAL";
  return "OUTRO"; // códigos numéricos: mapear após validar com o equipamento
}

function mapearSentido(v: unknown): "ENTRADA" | "SAIDA" | undefined {
  const s = String(v ?? "").toLowerCase();
  if (/(^|\b)(entry|entrada|in)(\b|$)/.test(s)) return "ENTRADA";
  if (/(^|\b)(exit|saida|saída|out)(\b|$)/.test(s)) return "SAIDA";
  return undefined;
}

export function parseEventoIntelbras(corpo: Buffer | string, contentType: string): EventoTraduzido {
  try {
    const buf = typeof corpo === "string" ? Buffer.from(corpo, "utf8") : corpo;
    const ct = (contentType || "").toLowerCase();
    let dado: unknown;
    if (ct.includes("multipart/")) dado = partesMultipart(buf, contentType);
    else if (ct.includes("x-www-form-urlencoded")) dado = Object.fromEntries(new URLSearchParams(buf.toString("utf8")));
    else dado = tentarJson(buf.toString("utf8"));
    if (dado === undefined) return { userId: null, metodo: "OUTRO", idEvento: null, bruto: buf.toString("utf8").slice(0, 2000) };

    const u = procurar(dado, CHAVES_USUARIO);
    const userId = u === undefined || String(u).trim() === "" || String(u) === "0" ? null : String(u).trim();
    const id = procurar(dado, CHAVES_ID);
    return {
      userId,
      metodo: mapearMetodo(procurar(dado, CHAVES_METODO)),
      sentido: mapearSentido(procurar(dado, CHAVES_SENTIDO)),
      idEvento: id === undefined ? null : String(id),
      bruto: dado,
    };
  } catch {
    return { userId: null, metodo: "OUTRO", idEvento: null, bruto: null };
  }
}
