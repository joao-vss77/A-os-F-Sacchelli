import type { ControleAcessoAdapter } from "./tipos.js";

/** Equipamento virtual: aceita todos os comandos e só registra no log. */
export class SimuladorAdapter implements ControleAcessoAdapter {
  constructor(private log: (m: string) => void) {}
  async cadastrarUsuario(u: { userId: number; nome: string }) { this.log(`[simulador] usuário ${u.userId} (${u.nome}) cadastrado`); }
  async cadastrarFace(userId: number, foto: string) { this.log(`[simulador] face do usuário ${userId} recebida (${Math.round(foto.length / 1024)} KB)`); }
  async capturarDigital(userId: number) { this.log(`[simulador] digital do usuário ${userId} capturada`); }
  async removerUsuario(userId: number) { this.log(`[simulador] usuário ${userId} removido`); }
  async abrirPorta() { this.log("[simulador] porta aberta"); }
  async disponivel() { return true; }
}
