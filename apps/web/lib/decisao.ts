import {
  avaliarAcesso, ROTULO_MOTIVO, type AutorizacaoInput, type MotivoNegativa, type OrigemRegistro, type ResultadoAcesso,
  type SituacaoPessoa, type TipoMovimento,
} from "@portaria/core";

export type MetodoIdentificacao = "FACIAL" | "DIGITAL" | "OUTRO" | "MANUAL" | "SIMULADOR";

export interface EntradaDecisao {
  /** id (uuid) ou identificador_externo do dispositivo; ausente no registro manual */
  dispositivoId?: string;
  /** UserID informado pelo equipamento (= pessoa.codigo_dispositivo). Nulo se não reconhecido. */
  userId?: string | null;
  /** Alternativa ao userId: pessoa escolhida pelo porteiro/simulador */
  pessoaId?: string | null;
  metodo: MetodoIdentificacao;
  sentido?: TipoMovimento;
  registradoPor?: string | null;
  bruto?: unknown;
  observacao?: string;
}

export interface PessoaDecisao { id: string; nome: string; situacao: SituacaoPessoa; tipo: "VISITANTE" | "FUNCIONARIO" }

export interface RegistroNovo {
  pessoa_id: string | null;
  autorizacao_id: string | null;
  dispositivo_id: string | null;
  registrado_por: string | null;
  tipo_movimento: TipoMovimento;
  origem: OrigemRegistro;
  resultado: ResultadoAcesso;
  motivo_negativa: MotivoNegativa | null;
  data_hora: string;
  observacao: string | null;
}

export interface RepoDecisao {
  buscarDispositivo(idOuIdentificador: string): Promise<{ id: string; sentido: "ENTRADA" | "SAIDA" | "BIDIRECIONAL" } | null>;
  buscarPessoaPorCodigo(codigo: string): Promise<PessoaDecisao | null>;
  buscarPessoaPorId(id: string): Promise<PessoaDecisao | null>;
  buscarAutorizacoes(pessoaId: string): Promise<AutorizacaoInput[]>;
  ultimoMovimento(pessoaId: string): Promise<TipoMovimento | null>;
  inserirRegistro(r: RegistroNovo): Promise<string>;
  inserirEvento(e: { dispositivo_id: string; registro_acesso_id: string; detalhe: unknown; codigo_externo: string | null }): Promise<void>;
  encerrarVisitaAberta(pessoaId: string, quando: Date): Promise<void>;
}

export interface ResultadoDecisao { permitido: boolean; mensagem: string; registroId: string; motivo: MotivoNegativa | null; nome: string | null; sentido: TipoMovimento }

const ORIGEM: Record<MetodoIdentificacao, OrigemRegistro> = {
  FACIAL: "RECONHECIMENTO_FACIAL", DIGITAL: "BIOMETRIA_DIGITAL", OUTRO: "RECONHECIMENTO_FACIAL", MANUAL: "MANUAL_PORTEIRO", SIMULADOR: "SIMULADOR",
};

/** Mensagem curta para o display do equipamento (máx. 40 caracteres). */
export function montarMensagem(d: { permitido: boolean; motivo: MotivoNegativa | null }, nomeCompleto: string | null, sentido: TipoMovimento): string {
  const primeiro = (nomeCompleto ?? "").trim().split(/\s+/)[0] ?? "";
  const txt = d.permitido
    ? `${sentido === "SAIDA" ? "Saída registrada" : "Acesso liberado"}${primeiro ? ` — ${primeiro}` : ""}`
    : `Acesso negado — ${ROTULO_MOTIVO[d.motivo ?? "SEM_AUTORIZACAO"]}`;
  return txt.length > 40 ? txt.slice(0, 39) + "…" : txt;
}

/** Decide (identificação ≠ autorização) e registra o acesso. Usado pelo agente, simulador e registro manual. */
export async function registrarDecisao(repo: RepoDecisao, e: EntradaDecisao, agora = new Date()): Promise<ResultadoDecisao> {
  const disp = e.dispositivoId ? await repo.buscarDispositivo(e.dispositivoId) : null;
  if (e.dispositivoId && !disp) throw new Error("Dispositivo não encontrado");

  const pessoa = e.pessoaId ? await repo.buscarPessoaPorId(e.pessoaId) : e.userId ? await repo.buscarPessoaPorCodigo(String(e.userId)) : null;
  let sentido: TipoMovimento = e.sentido ?? (disp?.sentido === "SAIDA" ? "SAIDA" : "ENTRADA");
  if (!e.sentido && disp?.sentido === "BIDIRECIONAL" && pessoa) sentido = (await repo.ultimoMovimento(pessoa.id)) === "ENTRADA" ? "SAIDA" : "ENTRADA";

  let decisao: { permitido: boolean; motivo: MotivoNegativa | null; autorizacaoId: string | null };
  if (!pessoa && !e.userId && !e.pessoaId) decisao = { permitido: false, motivo: "NAO_RECONHECIDO", autorizacaoId: null };
  else {
    const autorizacoes = pessoa ? await repo.buscarAutorizacoes(pessoa.id) : [];
    decisao = avaliarAcesso({ pessoa, autorizacoes, agora, sentido });
  }

  const registroId = await repo.inserirRegistro({
    pessoa_id: pessoa?.id ?? null,
    autorizacao_id: decisao.autorizacaoId,
    dispositivo_id: disp?.id ?? null,
    registrado_por: e.registradoPor ?? null,
    tipo_movimento: sentido,
    origem: ORIGEM[e.metodo],
    resultado: decisao.permitido ? "LIBERADO" : "NEGADO",
    motivo_negativa: decisao.permitido ? null : decisao.motivo,
    data_hora: agora.toISOString(),
    observacao: e.observacao ?? (e.metodo === "OUTRO" ? "Método de identificação não informado pelo equipamento" : null),
  });
  if (e.bruto !== undefined && disp) {
    await repo.inserirEvento({ dispositivo_id: disp.id, registro_acesso_id: registroId, detalhe: e.bruto, codigo_externo: e.userId ? String(e.userId) : null });
  }
  if (decisao.permitido && sentido === "SAIDA" && pessoa?.tipo === "VISITANTE") await repo.encerrarVisitaAberta(pessoa.id, agora);

  return { permitido: decisao.permitido, mensagem: montarMensagem(decisao, pessoa?.nome ?? null, sentido), registroId, motivo: decisao.motivo, nome: pessoa?.nome ?? null, sentido };
}
