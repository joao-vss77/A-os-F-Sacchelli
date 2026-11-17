import { describe, it, expect, beforeAll } from "vitest";
import { checarAgente, proximaSituacaoComando } from "@/lib/agente";

beforeAll(() => { process.env.AGENTE_TOKEN = "token-de-teste-com-32-caracteres!"; });

describe("checarAgente", () => {
  it("aceita token correto", () => {
    expect(checarAgente(new Request("http://x", { headers: { authorization: "Bearer token-de-teste-com-32-caracteres!" } }))).toBeNull();
  });
  it("recusa ausente ou errado", () => {
    expect(checarAgente(new Request("http://x"))?.status).toBe(401);
    expect(checarAgente(new Request("http://x", { headers: { authorization: "Bearer outro" } }))?.status).toBe(401);
  });
});

describe("proximaSituacaoComando", () => {
  it("conclui quando ok", () => expect(proximaSituacaoComando(1, true)).toBe("CONCLUIDO"));
  it("volta para PENDENTE até 3 tentativas e depois ERRO", () => {
    expect(proximaSituacaoComando(1, false)).toBe("PENDENTE");
    expect(proximaSituacaoComando(2, false)).toBe("PENDENTE");
    expect(proximaSituacaoComando(3, false)).toBe("ERRO");
  });
});
