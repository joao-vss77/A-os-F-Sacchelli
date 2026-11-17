import type { Config } from "./config.js";
import type { Metodo } from "./parser.js";

export interface Comando { id: string; tipo: string; payload: Record<string, unknown> }
export interface Decisao { permitido: boolean; mensagem: string; registroId: string }

/** Cliente da API do Sistema de Portaria (Vercel). Toda conexão é iniciada pelo agente (HTTPS de saída). */
export class Nuvem {
  constructor(private cfg: Config) {}

  private async chamar<T>(caminho: string, init: RequestInit = {}, timeoutMs = 10000): Promise<T> {
    const r = await fetch(`${this.cfg.nuvemUrl}${caminho}`, {
      ...init,
      headers: { "content-type": "application/json", authorization: `Bearer ${this.cfg.token}`, ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) throw new Error(`Nuvem ${caminho} respondeu HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return (await r.json()) as T;
  }

  decidir(e: { userId: string | null; metodo: Metodo; sentido?: string; bruto: unknown }, timeoutMs: number): Promise<Decisao> {
    return this.chamar("/api/agente/decisao", { method: "POST", body: JSON.stringify({ dispositivoId: this.cfg.dispositivoId, ...e }) }, timeoutMs);
  }

  async buscarComandos(): Promise<Comando[]> {
    const r = await this.chamar<{ comandos: Comando[] }>(`/api/agente/comandos?dispositivo=${encodeURIComponent(this.cfg.dispositivoId)}`);
    return r.comandos ?? [];
  }

  async reportarComando(id: string, resultado: { ok: boolean; erro?: string; referenciaExterna?: string }): Promise<void> {
    await this.chamar(`/api/agente/comandos/${id}`, { method: "PATCH", body: JSON.stringify(resultado) });
  }

  async heartbeat(disponivel: boolean): Promise<void> {
    await this.chamar("/api/agente/heartbeat", { method: "POST", body: JSON.stringify({ dispositivoId: this.cfg.dispositivoId, disponivel }) });
  }

  async evento(tipo: string, detalhe: unknown, sucesso: boolean): Promise<void> {
    await this.chamar("/api/agente/eventos", { method: "POST", body: JSON.stringify({ dispositivoId: this.cfg.dispositivoId, tipo, detalhe, sucesso }) });
  }
}
