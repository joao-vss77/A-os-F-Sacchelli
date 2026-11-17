import { describe, it, expect, vi, afterEach } from "vitest";
import type { AddressInfo } from "node:net";
import { parseEventoIntelbras } from "../src/parser.js";
import { calcularRespostaDigest } from "../src/digest.js";
import { criarServidor } from "../src/servidor.js";
import { processarFila } from "../src/fila.js";
import { NaoSuportado, type ControleAcessoAdapter } from "../src/adapters/tipos.js";
import type { Nuvem } from "../src/nuvem.js";
import { carregarConfig } from "../src/config.js";

describe("parseEventoIntelbras", () => {
  it("JSON com UserID aninhado e método facial", () => {
    const corpo = JSON.stringify({ Events: [{ Code: "AccessControl", Data: { UserID: "1001", Method: "Face", Type: "Entry" } }] });
    expect(parseEventoIntelbras(corpo, "application/json")).toMatchObject({ userId: "1001", metodo: "FACIAL", sentido: "ENTRADA" });
  });
  it("digital por OpenMethod textual", () => {
    expect(parseEventoIntelbras(JSON.stringify({ UserId: 1002, OpenMethod: "FingerPrint" }), "application/json")).toMatchObject({ userId: "1002", metodo: "DIGITAL" });
  });
  it("multipart com parte JSON e foto", () => {
    const b = "XyZ";
    const corpo = [
      `--${b}`, 'Content-Disposition: form-data; name="info"', "Content-Type: application/json", "", JSON.stringify({ UserID: "1003", Method: "Face" }),
      `--${b}`, 'Content-Disposition: form-data; name="photo"; filename="a.jpg"', "Content-Type: image/jpeg", "", "\xff\xd8\xff binario",
      `--${b}--`, "",
    ].join("\r\n");
    expect(parseEventoIntelbras(Buffer.from(corpo, "latin1"), `multipart/form-data; boundary=${b}`)).toMatchObject({ userId: "1003", metodo: "FACIAL" });
  });
  it("form urlencoded", () => {
    expect(parseEventoIntelbras("UserID=1004&Method=Face", "application/x-www-form-urlencoded").userId).toBe("1004");
  });
  it("lixo ou usuário vazio não lança e devolve userId nulo", () => {
    expect(parseEventoIntelbras("{{{nada", "application/json")).toMatchObject({ userId: null, metodo: "OUTRO" });
    expect(parseEventoIntelbras(JSON.stringify({ UserID: "" }), "application/json").userId).toBeNull();
    expect(parseEventoIntelbras(Buffer.alloc(0), "")).toMatchObject({ userId: null });
  });
});

describe("digest", () => {
  it("calcula a resposta do exemplo da RFC 2617", () => {
    expect(calcularRespostaDigest({
      usuario: "Mufasa", senha: "Circle Of Life", realm: "testrealm@host.com", nonce: "dcd98b7102dd2f0e8b11d0f600bfb0c093",
      metodo: "GET", uri: "/dir/index.html", qop: "auth", nc: "00000001", cnonce: "0a4f113b",
    })).toBe("6629fae49393a05397450978507c4ef1");
  });
});

function nuvemFalsa(o: Partial<Nuvem> = {}): Nuvem {
  return {
    decidir: vi.fn(async () => ({ permitido: true, mensagem: "Acesso liberado — Ana", registroId: "r1" })),
    buscarComandos: vi.fn(async () => []),
    reportarComando: vi.fn(async () => {}),
    heartbeat: vi.fn(async () => {}),
    evento: vi.fn(async () => {}),
    ...o,
  } as unknown as Nuvem;
}

const cfg = carregarConfig({
  NUVEM_URL: "http://nuvem.local", AGENTE_TOKEN: "x".repeat(32), DISPOSITIVO_ID: "portaria-01", MODO: "SIMULADOR", TIMEOUT_NUVEM_MS: "150",
});

describe("servidor Modo Online", () => {
  let fechar: (() => void) | null = null;
  afterEach(() => fechar?.());
  async function subir(nuvem: Nuvem) {
    const srv = criarServidor(cfg, nuvem, () => {});
    await new Promise<void>((r) => srv.listen(0, r));
    fechar = () => srv.close();
    return `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
  }

  it("responde auth true quando a nuvem libera", async () => {
    const url = await subir(nuvemFalsa());
    const r = await fetch(`${url}/notification`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ UserID: "1001", Method: "Face" }) });
    expect(await r.json()).toMatchObject({ auth: "true", message: "Acesso liberado — Ana", code: "200" });
  });

  it("nega com falha de comunicação se a nuvem passar do tempo limite", async () => {
    const nuvem = nuvemFalsa({ decidir: vi.fn(() => new Promise((res) => setTimeout(() => res({ permitido: true, mensagem: "tarde", registroId: "x" }), 1000))) as Nuvem["decidir"] });
    const url = await subir(nuvem);
    const t0 = Date.now();
    const r = await fetch(`${url}/notification`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ UserID: "1001" }) });
    const j = await r.json();
    expect(j.auth).toBe("false");
    expect(j.message).toMatch(/comunica/i);
    expect(Date.now() - t0).toBeLessThan(900);
    expect(nuvem.evento).toHaveBeenCalledWith("FALHA_COMUNICACAO", expect.anything(), false);
  });

  it("keepalive responde 200", async () => {
    const url = await subir(nuvemFalsa());
    expect((await fetch(`${url}/keepalive`)).status).toBe(200);
  });
});

describe("processarFila", () => {
  it("reporta erro de comando não suportado sem derrubar a fila", async () => {
    const adapter = {
      cadastrarUsuario: vi.fn(async () => {}),
      cadastrarFace: vi.fn(async () => {}),
      capturarDigital: vi.fn(async () => { throw new NaoSuportado("cadastre no aparelho"); }),
      removerUsuario: vi.fn(async () => {}),
      abrirPorta: vi.fn(async () => {}),
      disponivel: vi.fn(async () => true),
    } satisfies ControleAcessoAdapter;
    const nuvem = nuvemFalsa({
      buscarComandos: vi.fn(async () => [
        { id: "c1", tipo: "CAPTURAR_DIGITAL", payload: { userId: 1001 } },
        { id: "c2", tipo: "CADASTRAR_USUARIO", payload: { userId: 1001, nome: "Ana" } },
      ]) as Nuvem["buscarComandos"],
    });
    await processarFila(nuvem, adapter, () => {});
    expect(nuvem.reportarComando).toHaveBeenCalledWith("c1", { ok: false, erro: "cadastre no aparelho" });
    expect(nuvem.reportarComando).toHaveBeenCalledWith("c2", { ok: true });
    expect(adapter.cadastrarUsuario).toHaveBeenCalledWith({ userId: 1001, nome: "Ana" });
  });
});
