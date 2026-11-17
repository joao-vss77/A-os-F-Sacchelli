"use server";
import { revalidatePath } from "next/cache";
import { fimDoDiaSP, normalizarCpf, normalizarPlaca, type TipoBiometria } from "@portaria/core";
import { supabaseServidor } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/sessao";
import { lerDadosVisitante, validarFormularioVisitante, type ErrosVisitante } from "@/lib/validacao";
import { solicitarBiometriaDb } from "@/lib/biometria";

export interface VisitantePreenchido {
  pessoaId: string;
  nome: string;
  email: string;
  telefone: string;
  cep: string;
  logradouroNumero: string;
  complemento: string;
  situacao: string;
  tipo: "VISITANTE" | "FUNCIONARIO";
}

export async function buscarPorCpf(cpf: string): Promise<VisitantePreenchido | null> {
  await exigirUsuario();
  const c = normalizarCpf(cpf);
  if (c.length !== 11) return null;
  const sb = supabaseServidor();
  const { data } = await sb
    .from("pessoa")
    .select("id, nome_completo, email, telefone, situacao, tipo_pessoa, visitante(cep, logradouro_numero, complemento)")
    .eq("cpf", c)
    .maybeSingle();
  if (!data) return null;
  const v = (data.visitante as unknown as { cep: string | null; logradouro_numero: string | null; complemento: string | null } | null) ?? null;
  return {
    pessoaId: data.id, nome: data.nome_completo, email: data.email ?? "", telefone: data.telefone ?? "",
    cep: v?.cep ?? "", logradouroNumero: v?.logradouro_numero ?? "", complemento: v?.complemento ?? "",
    situacao: data.situacao, tipo: data.tipo_pessoa,
  };
}

export type EstadoCadastro =
  | { ok: false; erros: ErrosVisitante; mensagem?: string }
  | { ok: true; pessoaId: string; nome: string; mensagem: string; erros: ErrosVisitante };

export async function salvarVisitanteEVisita(_prev: EstadoCadastro | null, form: FormData): Promise<EstadoCadastro> {
  const u = await exigirUsuario(["PORTEIRO", "GESTOR", "ADMIN"]);
  const d = lerDadosVisitante(form);
  const erros = validarFormularioVisitante(d);
  if (Object.keys(erros).length) return { ok: false, erros, mensagem: "Corrija os campos destacados." };

  const sb = supabaseServidor();
  const cpf = normalizarCpf(d.cpf);
  const { data: existente } = await sb.from("pessoa").select("id, tipo_pessoa, situacao").eq("cpf", cpf).maybeSingle();
  if (existente?.tipo_pessoa === "FUNCIONARIO") return { ok: false, erros: { cpf: "CPF pertence a um funcionário" } };
  if (existente?.situacao === "BLOQUEADA")
    return { ok: false, erros: {}, mensagem: "Pessoa bloqueada. Procure o gestor antes de registrar a visita." };

  const dadosPessoa = { nome_completo: d.nome.trim(), email: d.email.trim().toLowerCase(), telefone: d.telefone.trim() || null };
  let pessoaId = existente?.id as string | undefined;
  if (pessoaId) {
    const { error } = await sb.from("pessoa").update(dadosPessoa).eq("id", pessoaId);
    if (error) return { ok: false, erros: {}, mensagem: error.message };
  } else {
    const { data, error } = await sb.from("pessoa").insert({ ...dadosPessoa, cpf, tipo_pessoa: "VISITANTE" }).select("id").single();
    if (error || !data) return { ok: false, erros: {}, mensagem: error?.message ?? "Falha ao salvar." };
    pessoaId = data.id;
  }
  const { error: eVis } = await sb.from("visitante").upsert({
    pessoa_id: pessoaId, cep: d.cep.replace(/\D/g, ""), logradouro_numero: d.logradouroNumero.trim() || null, complemento: d.complemento.trim() || null,
  });
  if (eVis) return { ok: false, erros: {}, mensagem: eVis.message };

  // Encerra visitas antigas ainda abertas desta pessoa (nova visita substitui)
  await sb.from("visita").update({ situacao: "ENCERRADA", encerrada_em: new Date().toISOString() }).eq("visitante_id", pessoaId).eq("situacao", "EM_ANDAMENTO");
  await sb.from("autorizacao_acesso").update({ situacao: "ENCERRADA" }).eq("pessoa_id", pessoaId).eq("situacao", "ATIVA").not("visita_id", "is", null);

  const { data: visita, error: eV } = await sb
    .from("visita")
    .insert({
      visitante_id: pessoaId, motivo_visita_id: d.motivoId,
      funcionario_visitado_id: d.visitadoTipo === "FUNCIONARIO" ? d.visitadoId : null,
      setor_visitado_id: d.visitadoTipo === "SETOR" ? d.visitadoId : null,
      empresa_origem: d.empresaOrigem.trim() || null,
      placa_veiculo: d.placa.trim() ? normalizarPlaca(d.placa) : null,
      registrada_por: u.id,
    })
    .select("id")
    .single();
  if (eV || !visita) return { ok: false, erros: {}, mensagem: eV?.message ?? "Falha ao registrar a visita." };

  const agora = new Date();
  const { error: eA } = await sb.from("autorizacao_acesso").insert({
    pessoa_id: pessoaId, visita_id: visita.id, valido_de: agora.toISOString(), valido_ate: fimDoDiaSP(agora).toISOString(), concedida_por: u.id,
  });
  if (eA) return { ok: false, erros: {}, mensagem: eA.message };

  revalidatePath("/visitantes");
  return { ok: true, erros: {}, pessoaId: pessoaId!, nome: d.nome.trim(), mensagem: "Visitante cadastrado e acesso autorizado até 23:59 de hoje." };
}

export async function solicitarBiometria(p: { pessoaId: string; tipo: TipoBiometria; dispositivoId: string; baseLegal: string; fotoBase64?: string }) {
  await exigirUsuario(["PORTEIRO", "GESTOR", "ADMIN"]);
  if (!p.baseLegal) return { ok: false, mensagem: "Informe a base legal para o tratamento biométrico." };
  if (p.fotoBase64 && p.fotoBase64.length > 600_000) return { ok: false, mensagem: "Foto muito grande. Capture novamente." };
  const r = await solicitarBiometriaDb(supabaseServidor(), p);
  revalidatePath(`/visitantes/${p.pessoaId}`);
  return r;
}
