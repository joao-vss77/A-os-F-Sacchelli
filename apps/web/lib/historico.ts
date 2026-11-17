import type { SupabaseClient } from "@supabase/supabase-js";

export interface FiltrosHistorico { de?: string; ate?: string; tipo?: string; resultado?: string; q?: string }

/** yyyy-mm-dd (dia em SP) → instante UTC de início/fim do dia (SP = UTC-3, sem horário de verão desde 2019). */
const inicio = (d: string) => new Date(`${d}T00:00:00-03:00`).toISOString();
const fim = (d: string) => new Date(`${d}T23:59:59.999-03:00`).toISOString();

export const SELECT_HISTORICO =
  "id, data_hora, tipo_movimento, resultado, motivo_negativa, origem, observacao, pessoa:pessoa_id(nome_completo, tipo_pessoa), dispositivo:dispositivo_id(nome), usuario:registrado_por(nome)";

export function consultaHistorico(sb: SupabaseClient, f: FiltrosHistorico, limite: number) {
  let c = sb.from("registro_acesso").select(SELECT_HISTORICO).order("data_hora", { ascending: false }).limit(limite);
  if (f.de && /^\d{4}-\d{2}-\d{2}$/.test(f.de)) c = c.gte("data_hora", inicio(f.de));
  if (f.ate && /^\d{4}-\d{2}-\d{2}$/.test(f.ate)) c = c.lte("data_hora", fim(f.ate));
  if (f.tipo === "ENTRADA" || f.tipo === "SAIDA") c = c.eq("tipo_movimento", f.tipo);
  if (f.resultado && ["LIBERADO", "NEGADO", "FALHA_TECNICA"].includes(f.resultado)) c = c.eq("resultado", f.resultado);
  return c;
}

export interface LinhaHistorico {
  id: string; data_hora: string; tipo_movimento: string; resultado: string; motivo_negativa: string | null; origem: string; observacao: string | null;
  pessoa: { nome_completo: string; tipo_pessoa: string } | null; dispositivo: { nome: string } | null; usuario: { nome: string } | null;
}

/** Filtro por nome feito após a consulta (nome está na tabela relacionada). */
export function filtrarPorNome(linhas: LinhaHistorico[], q?: string) {
  const t = (q ?? "").trim().toLowerCase();
  return t ? linhas.filter((l) => (l.pessoa?.nome_completo ?? "pessoa não identificada").toLowerCase().includes(t)) : linhas;
}
