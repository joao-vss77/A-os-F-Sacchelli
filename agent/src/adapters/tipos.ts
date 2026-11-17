/** Contrato neutro (porta ControleAcessoGateway do documento técnico). */
export interface ControleAcessoAdapter {
  cadastrarUsuario(u: { userId: number; nome: string }): Promise<void>;
  cadastrarFace(userId: number, fotoBase64: string): Promise<void>;
  capturarDigital(userId: number): Promise<void>;
  removerUsuario(userId: number): Promise<void>;
  abrirPorta(): Promise<void>;
  disponivel(): Promise<boolean>;
}

/** Operação que o modelo/firmware não suporta (o comando vira ERRO com instrução ao porteiro). */
export class NaoSuportado extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "NaoSuportado";
  }
}
