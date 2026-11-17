import { cpfValido, placaValida } from "@portaria/core";

export interface DadosVisitante {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  cep: string;
  logradouroNumero: string;
  complemento: string;
  empresaOrigem: string;
  visitadoTipo: "FUNCIONARIO" | "SETOR";
  visitadoId: string;
  motivoId: string;
  placa: string;
}

export type ErrosVisitante = Partial<Record<keyof DadosVisitante, string>>;

/** Validação compartilhada por navegador e servidor (campos obrigatórios da interface). */
export function validarFormularioVisitante(d: DadosVisitante): ErrosVisitante {
  const e: ErrosVisitante = {};
  const nome = d.nome.trim();
  if (!nome) e.nome = "Campo obrigatório";
  else if (nome.split(/\s+/).length < 2) e.nome = "Informe o nome completo";

  if (!d.cpf.trim()) e.cpf = "Campo obrigatório";
  else if (!cpfValido(d.cpf)) e.cpf = "CPF inválido";

  if (!d.email.trim()) e.email = "Campo obrigatório";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = "E-mail inválido";

  const cep = d.cep.replace(/\D/g, "");
  if (!d.cep.trim()) e.cep = "Campo obrigatório";
  else if (cep.length !== 8) e.cep = "CEP inválido";

  if (d.telefone.trim() && d.telefone.replace(/\D/g, "").length < 10) e.telefone = "Telefone inválido";
  if (!d.visitadoId) e.visitadoId = "Informe a pessoa ou o setor visitado";
  if (!d.motivoId) e.motivoId = "Selecione o motivo da visita";
  if (d.placa.trim() && !placaValida(d.placa)) e.placa = "Placa inválida";
  return e;
}

export function lerDadosVisitante(f: FormData): DadosVisitante {
  const s = (k: string) => String(f.get(k) ?? "");
  return {
    nome: s("nome"), cpf: s("cpf"), email: s("email"), telefone: s("telefone"), cep: s("cep"),
    logradouroNumero: s("logradouroNumero"), complemento: s("complemento"), empresaOrigem: s("empresaOrigem"),
    visitadoTipo: s("visitadoTipo") === "FUNCIONARIO" ? "FUNCIONARIO" : "SETOR",
    visitadoId: s("visitadoId"), motivoId: s("motivoId"), placa: s("placa"),
  };
}
