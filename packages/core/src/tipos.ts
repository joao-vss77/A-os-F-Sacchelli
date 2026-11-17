export const MOTIVOS_NEGATIVA = [
  "NAO_RECONHECIDO",
  "PESSOA_NAO_CADASTRADA",
  "SEM_AUTORIZACAO",
  "AUTORIZACAO_EXPIRADA",
  "AUTORIZACAO_REVOGADA",
  "PESSOA_BLOQUEADA",
  "FALHA_RECONHECIMENTO",
  "FALHA_COMUNICACAO",
  "DISPOSITIVO_INDISPONIVEL",
] as const;
export type MotivoNegativa = (typeof MOTIVOS_NEGATIVA)[number];

export const ROTULO_MOTIVO: Record<MotivoNegativa, string> = {
  NAO_RECONHECIDO: "Pessoa não reconhecida",
  PESSOA_NAO_CADASTRADA: "Pessoa não cadastrada",
  SEM_AUTORIZACAO: "Sem autorização",
  AUTORIZACAO_EXPIRADA: "Autorização expirada",
  AUTORIZACAO_REVOGADA: "Autorização revogada",
  PESSOA_BLOQUEADA: "Pessoa bloqueada",
  FALHA_RECONHECIMENTO: "Falha no reconhecimento",
  FALHA_COMUNICACAO: "Falha de comunicação",
  DISPOSITIVO_INDISPONIVEL: "Dispositivo indisponível",
};

export type SituacaoPessoa = "ATIVA" | "INATIVA" | "BLOQUEADA";
export type SituacaoAutorizacao = "ATIVA" | "REVOGADA" | "ENCERRADA";
export type TipoMovimento = "ENTRADA" | "SAIDA";
export type ResultadoAcesso = "LIBERADO" | "NEGADO" | "FALHA_TECNICA";
export type OrigemRegistro = "RECONHECIMENTO_FACIAL" | "BIOMETRIA_DIGITAL" | "MANUAL_PORTEIRO" | "SIMULADOR";
export type Perfil = "PORTEIRO" | "GESTOR" | "ADMIN";
export type TipoBiometria = "FACIAL" | "DIGITAL";
export type TipoComando = "CADASTRAR_USUARIO" | "CADASTRAR_FACE" | "CAPTURAR_DIGITAL" | "REMOVER_USUARIO" | "ABRIR_PORTA";
