"use server";
import { revalidatePath } from "next/cache";
import { normalizarCpf, type TipoMovimento } from "@portaria/core";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin, supabaseServidor } from "@/lib/supabase/server";
import { registrarDecisao } from "@/lib/decisao";
import { repoSupabase } from "@/lib/decisao-supabase";

export interface PessoaBusca { id: string; nome: string; tipo: string; situacao: string; codigo: number }

export async function buscarPessoas(q: string): Promise<PessoaBusca[]> {
  await exigirUsuario();
  const t = q.trim();
  if (t.length < 2) return [];
  const sb = supabaseServidor();
  const cpf = normalizarCpf(t);
  let c = sb.from("pessoa").select("id, nome_completo, tipo_pessoa, situacao, codigo_dispositivo").order("nome_completo").limit(8);
  c = /^\d/.test(t) && cpf.length >= 3 ? c.like("cpf", `${cpf}%`) : c.ilike("nome_completo", `%${t}%`);
  const { data } = await c;
  return (data ?? []).map((p) => ({ id: p.id, nome: p.nome_completo, tipo: p.tipo_pessoa, situacao: p.situacao, codigo: p.codigo_dispositivo }));
}

export interface ResultadoTela { permitido: boolean; mensagem: string; nome: string | null; sentido: TipoMovimento; motivo: string | null }

/** Registro manual (contingência). A regra de autorização é a mesma do equipamento. */
export async function registrarManual(pessoaId: string, sentido: TipoMovimento, observacao?: string): Promise<ResultadoTela> {
  const u = await exigirUsuario(["PORTEIRO", "GESTOR", "ADMIN"]);
  const r = await registrarDecisao(repoSupabase(supabaseAdmin()), { pessoaId, metodo: "MANUAL", sentido, registradoPor: u.id, observacao });
  revalidatePath("/portaria");
  return { permitido: r.permitido, mensagem: r.mensagem, nome: r.nome, sentido: r.sentido, motivo: r.motivo };
}

/** Equipamento virtual: simula uma identificação facial/digital (ou rosto desconhecido). */
export async function simularPassagem(p: { dispositivoId: string; pessoaId: string | null; metodo: "FACIAL" | "DIGITAL"; sentido: "AUTO" | TipoMovimento }): Promise<ResultadoTela> {
  const u = await exigirUsuario(["GESTOR", "ADMIN"]);
  const sb = supabaseAdmin();
  let userId: string | null = null;
  if (p.pessoaId) {
    const { data } = await sb.from("pessoa").select("codigo_dispositivo").eq("id", p.pessoaId).single();
    userId = data ? String(data.codigo_dispositivo) : null;
  }
  const r = await registrarDecisao(repoSupabase(sb), {
    dispositivoId: p.dispositivoId, userId, metodo: "SIMULADOR", registradoPor: u.id,
    sentido: p.sentido === "AUTO" ? undefined : p.sentido,
    observacao: `Simulação: ${p.metodo === "FACIAL" ? "reconhecimento facial" : "digital"}`,
  });
  return { permitido: r.permitido, mensagem: r.mensagem, nome: r.nome, sentido: r.sentido, motivo: r.motivo };
}
