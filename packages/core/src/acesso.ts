import type { MotivoNegativa, SituacaoAutorizacao, SituacaoPessoa, TipoMovimento } from "./tipos";

export interface AutorizacaoInput {
  id: string;
  situacao: SituacaoAutorizacao;
  validoDe: Date;
  validoAte: Date | null;
}

export interface AvaliacaoInput {
  pessoa: { situacao: SituacaoPessoa } | null;
  autorizacoes: AutorizacaoInput[];
  agora: Date;
  sentido: TipoMovimento;
}

export interface DecisaoAcesso {
  permitido: boolean;
  motivo: MotivoNegativa | null;
  autorizacaoId: string | null;
}

const negar = (motivo: MotivoNegativa): DecisaoAcesso => ({ permitido: false, motivo, autorizacaoId: null });

/**
 * Regra de decisão (PDF, fig. 10). A identificação já ocorreu no equipamento;
 * aqui só se decide a AUTORIZAÇÃO.
 */
export function avaliarAcesso({ pessoa, autorizacoes, agora, sentido }: AvaliacaoInput): DecisaoAcesso {
  if (!pessoa) return negar("PESSOA_NAO_CADASTRADA");
  // Saída nunca é bloqueada por regra (PDF RN10 — premissa); fica registrada.
  if (sentido === "SAIDA") return { permitido: true, motivo: null, autorizacaoId: null };
  if (pessoa.situacao !== "ATIVA") return negar("PESSOA_BLOQUEADA");
  if (autorizacoes.length === 0) return negar("SEM_AUTORIZACAO");

  const t = agora.getTime();
  const vigente = autorizacoes.find(
    (a) => a.situacao === "ATIVA" && a.validoDe.getTime() <= t && (a.validoAte === null || a.validoAte.getTime() >= t),
  );
  if (vigente) return { permitido: true, motivo: null, autorizacaoId: vigente.id };
  if (autorizacoes.some((a) => a.situacao === "ATIVA")) return negar("AUTORIZACAO_EXPIRADA");
  return negar("AUTORIZACAO_REVOGADA");
}
