import { describe, it, expect } from "vitest";
import { normalizarCpf, cpfValido, formatarCpf, placaValida, fimDoDiaSP, avaliarAcesso, type AutorizacaoInput } from "../src/index";

describe("cpf", () => {
  it("valida CPF com e sem máscara", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("52998224725")).toBe(true);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("529.982.247-24")).toBe(false);
    expect(cpfValido("123")).toBe(false);
  });
  it("normaliza e formata", () => {
    expect(normalizarCpf("529.982.247-25")).toBe("52998224725");
    expect(normalizarCpf(" 529 982 247 25 ")).toBe("52998224725");
    expect(formatarCpf("52998224725")).toBe("529.982.247-25");
  });
});

describe("placa", () => {
  it("aceita padrão antigo e Mercosul", () => {
    expect(placaValida("ABC-1234")).toBe(true);
    expect(placaValida("abc1234")).toBe(true);
    expect(placaValida("BRA2E19")).toBe(true);
    expect(placaValida("AB123")).toBe(false);
  });
});

describe("fimDoDiaSP", () => {
  it("usa o dia de São Paulo, não o de UTC", () => {
    // 02:30Z do dia 17 ainda é 23:30 do dia 16 em SP
    expect(fimDoDiaSP(new Date("2026-11-17T02:30:00Z")).toISOString()).toBe("2026-11-17T02:59:59.999Z");
    // 15:00Z do dia 17 = 12:00 SP do dia 17
    expect(fimDoDiaSP(new Date("2026-11-17T15:00:00Z")).toISOString()).toBe("2026-11-18T02:59:59.999Z");
  });
});

describe("avaliarAcesso", () => {
  const agora = new Date("2026-11-17T15:00:00Z");
  const ativa = (o: Partial<AutorizacaoInput> = {}): AutorizacaoInput => ({
    id: "a1", situacao: "ATIVA", validoDe: new Date("2026-11-17T10:00:00Z"), validoAte: new Date("2026-11-18T02:59:59Z"), ...o,
  });
  const base = { pessoa: { situacao: "ATIVA" as const }, autorizacoes: [ativa()], agora, sentido: "ENTRADA" as const };

  it("pessoa inexistente", () => {
    expect(avaliarAcesso({ ...base, pessoa: null })).toEqual({ permitido: false, motivo: "PESSOA_NAO_CADASTRADA", autorizacaoId: null });
  });
  it("pessoa bloqueada ou inativa", () => {
    expect(avaliarAcesso({ ...base, pessoa: { situacao: "BLOQUEADA" } }).motivo).toBe("PESSOA_BLOQUEADA");
    expect(avaliarAcesso({ ...base, pessoa: { situacao: "INATIVA" } }).motivo).toBe("PESSOA_BLOQUEADA");
  });
  it("sem autorização", () => {
    expect(avaliarAcesso({ ...base, autorizacoes: [] }).motivo).toBe("SEM_AUTORIZACAO");
  });
  it("autorização vigente libera", () => {
    expect(avaliarAcesso(base)).toEqual({ permitido: true, motivo: null, autorizacaoId: "a1" });
  });
  it("sem término (funcionário) libera", () => {
    expect(avaliarAcesso({ ...base, autorizacoes: [ativa({ id: "f", validoAte: null })] }).autorizacaoId).toBe("f");
  });
  it("só revogada/encerrada", () => {
    expect(avaliarAcesso({ ...base, autorizacoes: [ativa({ situacao: "REVOGADA" })] }).motivo).toBe("AUTORIZACAO_REVOGADA");
  });
  it("ativa fora da janela = expirada", () => {
    expect(avaliarAcesso({ ...base, autorizacoes: [ativa({ validoAte: new Date("2026-11-17T12:00:00Z") })] }).motivo).toBe("AUTORIZACAO_EXPIRADA");
    expect(avaliarAcesso({ ...base, autorizacoes: [ativa({ validoDe: new Date("2026-11-18T12:00:00Z") })] }).motivo).toBe("AUTORIZACAO_EXPIRADA");
  });
  it("vigente prevalece sobre revogada", () => {
    expect(avaliarAcesso({ ...base, autorizacoes: [ativa({ id: "r", situacao: "REVOGADA" }), ativa({ id: "ok" })] }).autorizacaoId).toBe("ok");
  });
  it("saída sempre permitida para pessoa conhecida", () => {
    expect(avaliarAcesso({ ...base, sentido: "SAIDA", autorizacoes: [] })).toEqual({ permitido: true, motivo: null, autorizacaoId: null });
  });
  it("saída de pessoa desconhecida é negada", () => {
    expect(avaliarAcesso({ ...base, sentido: "SAIDA", pessoa: null }).motivo).toBe("PESSOA_NAO_CADASTRADA");
  });
});
