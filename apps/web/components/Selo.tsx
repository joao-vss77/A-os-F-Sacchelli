const CORES: Record<string, string> = {
  LIBERADO: "bg-green-100 text-green-800",
  ATIVA: "bg-green-100 text-green-800",
  ATIVO: "bg-green-100 text-green-800",
  SINCRONIZADA: "bg-green-100 text-green-800",
  CONCLUIDO: "bg-green-100 text-green-800",
  EM_ANDAMENTO: "bg-blue-100 text-blue-800",
  ENTRADA: "bg-blue-100 text-blue-800",
  SAIDA: "bg-slate-200 text-slate-700",
  PENDENTE: "bg-amber-100 text-amber-800",
  PENDENTE_SINCRONIZACAO: "bg-amber-100 text-amber-800",
  EXECUTANDO: "bg-amber-100 text-amber-800",
  FALHA_TECNICA: "bg-amber-100 text-amber-800",
  NEGADO: "bg-red-100 text-red-800",
  BLOQUEADA: "bg-red-100 text-red-800",
  REVOGADA: "bg-red-100 text-red-800",
  ERRO: "bg-red-100 text-red-800",
  ERRO_SINCRONIZACAO: "bg-red-100 text-red-800",
  INDISPONIVEL: "bg-red-100 text-red-800",
};

const ROTULOS: Record<string, string> = {
  PENDENTE_SINCRONIZACAO: "Sincronizando",
  ERRO_SINCRONIZACAO: "Erro de sincronização",
  EM_ANDAMENTO: "Em andamento",
  FALHA_TECNICA: "Falha técnica",
  SAIDA: "Saída",
  INDISPONIVEL: "Indisponível",
  CONCLUIDO: "Concluído",
};

export function Selo({ valor }: { valor: string | null | undefined }) {
  if (!valor) return null;
  const rotulo = ROTULOS[valor] ?? valor.charAt(0) + valor.slice(1).toLowerCase().replace(/_/g, " ");
  return <span className={`selo ${CORES[valor] ?? "bg-slate-100 text-slate-700"}`}>{rotulo}</span>;
}
