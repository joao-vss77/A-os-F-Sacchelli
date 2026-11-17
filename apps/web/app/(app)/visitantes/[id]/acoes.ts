"use server";
import { revalidatePath } from "next/cache";
import { fimDoDiaSP } from "@portaria/core";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";

export async function revogarAutorizacao(autorizacaoId: string, pessoaId: string, motivo?: string) {
  await exigirUsuario(["GESTOR", "ADMIN", "PORTEIRO"]);
  await supabaseServidor().from("autorizacao_acesso")
    .update({ situacao: "REVOGADA", revogada_em: new Date().toISOString(), motivo_revogacao: motivo || "Revogada na portaria" })
    .eq("id", autorizacaoId);
  revalidatePath(`/visitantes/${pessoaId}`);
}

export async function alterarSituacaoPessoa(pessoaId: string, situacao: "ATIVA" | "BLOQUEADA") {
  await exigirUsuario(["GESTOR", "ADMIN"]);
  await supabaseServidor().from("pessoa").update({ situacao }).eq("id", pessoaId);
  revalidatePath(`/visitantes/${pessoaId}`);
}

/** Renova o acesso do visitante até o fim do dia, ligado à visita em andamento. */
export async function renovarAutorizacaoHoje(pessoaId: string) {
  const u = await exigirUsuario(["PORTEIRO", "GESTOR", "ADMIN"]);
  const sb = supabaseServidor();
  const { data: visita } = await sb.from("visita").select("id").eq("visitante_id", pessoaId).eq("situacao", "EM_ANDAMENTO")
    .order("criada_em", { ascending: false }).limit(1).maybeSingle();
  if (!visita) return { ok: false, mensagem: "Não há visita em andamento. Registre uma nova visita pelo cadastro." };
  const agora = new Date();
  await sb.from("autorizacao_acesso").delete().eq("visita_id", visita.id).neq("situacao", "ATIVA");
  const { error } = await sb.from("autorizacao_acesso").upsert(
    { pessoa_id: pessoaId, visita_id: visita.id, valido_de: agora.toISOString(), valido_ate: fimDoDiaSP(agora).toISOString(), situacao: "ATIVA", concedida_por: u.id, revogada_em: null },
    { onConflict: "visita_id" },
  );
  revalidatePath(`/visitantes/${pessoaId}`);
  return error ? { ok: false, mensagem: error.message } : { ok: true, mensagem: "Acesso renovado até 23:59 de hoje." };
}

/** Remove a pessoa dos equipamentos (face e digital) — fim da finalidade (LGPD). */
export async function removerBiometria(pessoaId: string) {
  await exigirUsuario(["PORTEIRO", "GESTOR", "ADMIN"]);
  const sb = supabaseServidor();
  const { data: p } = await sb.from("pessoa").select("codigo_dispositivo").eq("id", pessoaId).single();
  const { data: disps } = await sb.from("dispositivo").select("id, modo_integracao").neq("situacao", "DESATIVADO");
  const reais = (disps ?? []).filter((d) => d.modo_integracao !== "SIMULADOR");
  if (reais.length && p) {
    await sb.from("comando_dispositivo").insert(reais.map((d) => ({ dispositivo_id: d.id, pessoa_id: pessoaId, tipo: "REMOVER_USUARIO", payload: { userId: p.codigo_dispositivo } })));
  }
  await sb.from("identificacao_biometrica").update(reais.length ? { situacao: "PENDENTE_SINCRONIZACAO" } : { situacao: "REMOVIDA", removida_em: new Date().toISOString() }).eq("pessoa_id", pessoaId);
  revalidatePath(`/visitantes/${pessoaId}`);
}
