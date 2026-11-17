import { createHash, randomBytes } from "node:crypto";

const md5 = (s: string) => createHash("md5").update(s).digest("hex");

export interface ParamsDigest {
  usuario: string; senha: string; realm: string; nonce: string; metodo: string; uri: string; qop?: string; nc: string; cnonce: string;
}

/** Resposta HTTP Digest (RFC 2617, MD5, qop=auth). */
export function calcularRespostaDigest(p: ParamsDigest): string {
  const ha1 = md5(`${p.usuario}:${p.realm}:${p.senha}`);
  const ha2 = md5(`${p.metodo}:${p.uri}`);
  return p.qop ? md5(`${ha1}:${p.nonce}:${p.nc}:${p.cnonce}:${p.qop}:${ha2}`) : md5(`${ha1}:${p.nonce}:${ha2}`);
}

function lerDesafio(h: string): Record<string, string> {
  const r: Record<string, string> = {};
  for (const m of h.replace(/^Digest\s+/i, "").matchAll(/(\w+)=(?:"([^"]*)"|([^,\s]+))/g)) r[m[1].toLowerCase()] = m[2] ?? m[3];
  return r;
}

/** fetch com autenticação Digest (a API CGI dos equipamentos Intelbras usa Digest). */
export async function fetchDigest(url: string, init: RequestInit & { usuario: string; senha: string; timeoutMs?: number }): Promise<Response> {
  const { usuario, senha, timeoutMs = 8000, ...req } = init;
  const sinal = () => AbortSignal.timeout(timeoutMs);
  const primeira = await fetch(url, { ...req, signal: sinal() });
  if (primeira.status !== 401) return primeira;
  const desafio = primeira.headers.get("www-authenticate") ?? "";
  if (!/^Digest/i.test(desafio)) return primeira;
  await primeira.arrayBuffer().catch(() => undefined);
  const d = lerDesafio(desafio);
  const u = new URL(url);
  const uri = u.pathname + u.search;
  const qop = d.qop?.split(",").map((x) => x.trim()).includes("auth") ? "auth" : undefined;
  const nc = "00000001";
  const cnonce = randomBytes(8).toString("hex");
  const metodo = (req.method ?? "GET").toUpperCase();
  const resposta = calcularRespostaDigest({ usuario, senha, realm: d.realm ?? "", nonce: d.nonce ?? "", metodo, uri, qop, nc, cnonce });
  const auth = [
    `Digest username="${usuario}"`, `realm="${d.realm ?? ""}"`, `nonce="${d.nonce ?? ""}"`, `uri="${uri}"`, `response="${resposta}"`,
    ...(d.opaque ? [`opaque="${d.opaque}"`] : []), ...(qop ? [`qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`] : []), `algorithm=MD5`,
  ].join(", ");
  return fetch(url, { ...req, headers: { ...(req.headers as Record<string, string>), authorization: auth }, signal: sinal() });
}
