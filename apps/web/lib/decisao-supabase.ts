import type { SupabaseClient } from "@supabase/supabase-js";
import type { RepoDecisao, PessoaDecisao } from "./decisao";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapPessoa(p: { id: string; nome_completo: string; situacao: string; tipo_pessoa: string } | null): PessoaDecisao | null {
  return p ? { id: p.id, nome: p.nome_completo, situacao: p.situacao as PessoaDecisao["situacao"], tipo: p.tipo_pessoa as PessoaDecisao["tipo"] } : null;
}

/** Repositório da decisão sobre o Supabase (use o cliente admin no servidor). */
export function repoSupabase(sb: SupabaseClient): RepoDecisao {
  const colsPessoa = "id, nome_completo, situacao, tipo_pessoa";
  return {
    async buscarDispositivo(chave) {
      const q = sb.from("dispositivo").select("id, sentido");
      const { data } = await (UUID.test(chave) ? q.eq("id", chave) : q.eq("identificador_externo", chave)).maybeSingle();
      return data ?? null;
    },
    async buscarPessoaPorCodigo(codigo) {
      const n = Number(codigo);
      if (!Number.isInteger(n)) return null;
      const { data } = await sb.from("pessoa").select(colsPessoa).eq("codigo_dispositivo", n).maybeSingle();
      return mapPessoa(data);
    },
    async buscarPessoaPorId(id) {
      const { data } = await sb.from("pessoa").select(colsPessoa).eq("id", id).maybeSingle();
      return mapPessoa(data);
    },
    async buscarAutorizacoes(pessoaId) {
      const { data } = await sb.from("autorizacao_acesso").select("id, situacao, valido_de, valido_ate").eq("pessoa_id", pessoaId);
      return (data ?? []).map((a) => ({ id: a.id, situacao: a.situacao, validoDe: new Date(a.valido_de), validoAte: a.valido_ate ? new Date(a.valido_ate) : null }));
    },
    async ultimoMovimento(pessoaId) {
      const { data } = await sb.from("registro_acesso").select("tipo_movimento").eq("pessoa_id", pessoaId).eq("resultado", "LIBERADO")
        .order("data_hora", { ascending: false }).limit(1).maybeSingle();
      return data?.tipo_movimento ?? null;
    },
    async inserirRegistro(r) {
      const { data, error } = await sb.from("registro_acesso").insert(r).select("id").single();
      if (error || !data) throw new Error(error?.message ?? "Falha ao registrar acesso");
      return data.id;
    },
    async inserirEvento(e) {
      await sb.from("evento_dispositivo").insert({ ...e, tipo_evento: "IDENTIFICACAO_RECEBIDA", detalhe: e.detalhe as object });
    },
    async encerrarVisitaAberta(pessoaId, quando) {
      const { data: visitas } = await sb.from("visita").update({ situacao: "ENCERRADA", encerrada_em: quando.toISOString() })
        .eq("visitante_id", pessoaId).eq("situacao", "EM_ANDAMENTO").select("id");
      const ids = (visitas ?? []).map((v) => v.id);
      if (ids.length) await sb.from("autorizacao_acesso").update({ situacao: "ENCERRADA" }).in("visita_id", ids).eq("situacao", "ATIVA");
    },
  };
}
