import { describe, it, expect } from "vitest";
import { registrarDecisao, montarMensagem, type RepoDecisao, type RegistroNovo } from "@/lib/decisao";

function repoFalso(o: Partial<{ pessoa: { id: string; nome: string; situacao: "ATIVA" | "BLOQUEADA"; tipo: "VISITANTE" | "FUNCIONARIO" } | null; sentidoDisp: "ENTRADA" | "SAIDA" | "BIDIRECIONAL"; ultimo: "ENTRADA" | "SAIDA" | null; auts: { id: string; situacao: "ATIVA"; validoDe: Date; validoAte: Date | null }[] }> = {}) {
  const registros: RegistroNovo[] = [];
  const encerradas: string[] = [];
  const pessoa = o.pessoa === undefined ? { id: "p1", nome: "Ana Souza", situacao: "ATIVA" as const, tipo: "VISITANTE" as const } : o.pessoa;
  const repo: RepoDecisao = {
    buscarDispositivo: async (id) => (id === "x" ? null : { id: "d1", sentido: o.sentidoDisp ?? "ENTRADA" }),
    buscarPessoaPorCodigo: async (codigo) => (codigo === "1001" ? pessoa : null),
    buscarPessoaPorId: async () => pessoa,
    buscarAutorizacoes: async () => o.auts ?? [{ id: "a1", situacao: "ATIVA", validoDe: new Date("2026-11-17T10:00:00Z"), validoAte: new Date("2026-11-18T02:59:59Z") }],
    ultimoMovimento: async () => o.ultimo ?? null,
    inserirRegistro: async (r) => { registros.push(r); return "r" + registros.length; },
    inserirEvento: async () => {},
    encerrarVisitaAberta: async (pid) => { encerradas.push(pid); },
  };
  return { repo, registros, encerradas };
}
const agora = new Date("2026-11-17T15:00:00Z");

describe("registrarDecisao", () => {
  it("libera visitante com autorização vigente e grava LIBERADO", async () => {
    const { repo, registros } = repoFalso();
    const r = await registrarDecisao(repo, { dispositivoId: "d1", userId: "1001", metodo: "FACIAL" }, agora);
    expect(r.permitido).toBe(true);
    expect(r.mensagem).toBe("Acesso liberado — Ana");
    expect(registros[0]).toMatchObject({ pessoa_id: "p1", resultado: "LIBERADO", tipo_movimento: "ENTRADA", origem: "RECONHECIMENTO_FACIAL", autorizacao_id: "a1", motivo_negativa: null });
  });
  it("userId nulo = NAO_RECONHECIDO", async () => {
    const { repo, registros } = repoFalso();
    const r = await registrarDecisao(repo, { dispositivoId: "d1", userId: null, metodo: "FACIAL" }, agora);
    expect(r.permitido).toBe(false);
    expect(registros[0]).toMatchObject({ pessoa_id: null, resultado: "NEGADO", motivo_negativa: "NAO_RECONHECIDO" });
  });
  it("userId desconhecido = PESSOA_NAO_CADASTRADA", async () => {
    const { repo, registros } = repoFalso();
    await registrarDecisao(repo, { dispositivoId: "d1", userId: "999", metodo: "DIGITAL" }, agora);
    expect(registros[0]).toMatchObject({ motivo_negativa: "PESSOA_NAO_CADASTRADA", origem: "BIOMETRIA_DIGITAL" });
  });
  it("autorização expirada nega com mensagem", async () => {
    const { repo } = repoFalso({ auts: [{ id: "a", situacao: "ATIVA", validoDe: new Date("2026-11-16T10:00:00Z"), validoAte: new Date("2026-11-17T02:59:59Z") }] });
    const r = await registrarDecisao(repo, { dispositivoId: "d1", userId: "1001", metodo: "FACIAL" }, agora);
    expect(r.mensagem).toBe("Acesso negado — Autorização expirada");
  });
  it("dispositivo bidirecional: pessoa presente => SAIDA e encerra visita", async () => {
    const { repo, registros, encerradas } = repoFalso({ sentidoDisp: "BIDIRECIONAL", ultimo: "ENTRADA" });
    const r = await registrarDecisao(repo, { dispositivoId: "d1", userId: "1001", metodo: "FACIAL" }, agora);
    expect(r.mensagem).toBe("Saída registrada — Ana");
    expect(registros[0].tipo_movimento).toBe("SAIDA");
    expect(encerradas).toEqual(["p1"]);
  });
  it("dispositivo inexistente lança erro", async () => {
    const { repo } = repoFalso();
    await expect(registrarDecisao(repo, { dispositivoId: "x", userId: "1001", metodo: "FACIAL" }, agora)).rejects.toThrow("Dispositivo não encontrado");
  });
});

describe("montarMensagem", () => {
  it("cabe no display (máx. 40 caracteres)", () => {
    expect(montarMensagem({ permitido: true, motivo: null }, "Maximiliano Bartolomeu de Albuquerque", "ENTRADA").length).toBeLessThanOrEqual(40);
  });
});
