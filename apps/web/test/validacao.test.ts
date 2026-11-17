import { describe, it, expect } from "vitest";
import { validarFormularioVisitante, type DadosVisitante } from "@/lib/validacao";

const ok: DadosVisitante = {
  nome: "Ana Souza", cpf: "529.982.247-25", email: "ana@exemplo.com", telefone: "(11) 98765-4321",
  cep: "01310-100", logradouroNumero: "Av. Paulista, 1000", complemento: "", empresaOrigem: "Fornecedora X",
  visitadoTipo: "SETOR", visitadoId: "setor-1", motivoId: "motivo-1", placa: "",
};

describe("validarFormularioVisitante", () => {
  it("aceita formulário completo", () => {
    expect(validarFormularioVisitante(ok)).toEqual({});
  });
  it("exige obrigatórios da interface", () => {
    const e = validarFormularioVisitante({ ...ok, nome: " ", email: "", cep: "", motivoId: "", visitadoId: "" });
    expect(Object.keys(e).sort()).toEqual(["cep", "email", "motivoId", "nome", "visitadoId"]);
  });
  it("rejeita CPF inválido, e-mail e CEP malformados", () => {
    const e = validarFormularioVisitante({ ...ok, cpf: "111.111.111-11", email: "ana@", cep: "123" });
    expect(e.cpf).toBe("CPF inválido");
    expect(e.email).toBe("E-mail inválido");
    expect(e.cep).toBe("CEP inválido");
  });
  it("placa é opcional, mas validada se informada", () => {
    expect(validarFormularioVisitante({ ...ok, placa: "BRA2E19" })).toEqual({});
    expect(validarFormularioVisitante({ ...ok, placa: "XX1" }).placa).toBe("Placa inválida");
  });
  it("nome precisa de nome e sobrenome", () => {
    expect(validarFormularioVisitante({ ...ok, nome: "Ana" }).nome).toBe("Informe o nome completo");
  });
});
