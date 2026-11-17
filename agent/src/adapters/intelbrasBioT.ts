import type { Config } from "../config.js";
import { fetchDigest } from "../digest.js";
import { NaoSuportado, type ControleAcessoAdapter } from "./tipos.js";

/**
 * Adaptador para controladores faciais Intelbras (linha Bio-T) via API CGI com Digest.
 *
 * Confirmado na documentação pública Intelbras:
 *  - AccessFace.cgi?action=insertMulti com FaceList [{ UserID, PhotoData (base64) }]
 *  - AccessUser.cgi?action=insertMulti para cadastro de usuário
 * PONTO A VALIDAR com o equipamento (campos e rotas seguem o padrão CGI da família, ainda não testados):
 *  - campos extras do usuário, remoção (removeMulti), abertura de porta (openDoor), teste de disponibilidade
 *  - captura remota de digital (não confirmada para terminais faciais)
 */
export class IntelbrasBioTAdapter implements ControleAcessoAdapter {
  private base: string;
  constructor(private cfg: Config) {
    const e = cfg.equip;
    this.base = `${e.https ? "https" : "http"}://${e.host}:${e.porta}`;
  }

  private async cgi(caminho: string, init: { method?: string; body?: unknown } = {}): Promise<string> {
    const r = await fetchDigest(`${this.base}${caminho}`, {
      method: init.method ?? "GET",
      headers: init.body ? { "content-type": "application/json" } : undefined,
      body: init.body ? JSON.stringify(init.body) : undefined,
      usuario: this.cfg.equip.usuario,
      senha: this.cfg.equip.senha,
    });
    const texto = await r.text();
    if (!r.ok || /^\s*Error/i.test(texto) || /"error"\s*:/i.test(texto)) {
      throw new Error(`Equipamento respondeu HTTP ${r.status}: ${texto.slice(0, 300)}`);
    }
    return texto;
  }

  async cadastrarUsuario(u: { userId: number; nome: string }) {
    const usuario = { UserID: String(u.userId), UserName: u.nome.slice(0, 32), UserType: 0, Authority: 2, Doors: [0], TimeSections: [255] };
    try {
      await this.cgi("/cgi-bin/AccessUser.cgi?action=insertMulti", { method: "POST", body: { UserList: [usuario] } });
    } catch (e) {
      // já existe no equipamento: atualiza (idempotente)
      if (!/exist|repeat|duplic/i.test((e as Error).message)) throw e;
      await this.cgi("/cgi-bin/AccessUser.cgi?action=updateMulti", { method: "POST", body: { UserList: [usuario] } });
    }
  }

  async cadastrarFace(userId: number, fotoBase64: string) {
    const caminho = "/cgi-bin/AccessFace.cgi?action=insertMulti";
    try {
      await this.cgi(caminho, { method: "POST", body: { FaceList: [{ UserID: String(userId), PhotoData: [fotoBase64] }] } });
    } catch (e) {
      // alguns firmwares esperam PhotoData como texto em vez de lista
      if (/exist|repeat/i.test((e as Error).message)) {
        await this.cgi("/cgi-bin/AccessFace.cgi?action=updateMulti", { method: "POST", body: { FaceList: [{ UserID: String(userId), PhotoData: [fotoBase64] }] } });
        return;
      }
      await this.cgi(caminho, { method: "POST", body: { FaceList: [{ UserID: String(userId), PhotoData: fotoBase64 }] } });
    }
  }

  async capturarDigital(userId: number): Promise<void> {
    throw new NaoSuportado(
      `Captura remota de digital ainda não validada para este modelo. Cadastre a digital no próprio equipamento no usuário de código ${userId} (Menu > Usuários).`,
    );
  }

  async removerUsuario(userId: number) {
    await this.cgi(`/cgi-bin/AccessUser.cgi?action=removeMulti&UserIDList[0]=${userId}`);
  }

  async abrirPorta() {
    await this.cgi(`/cgi-bin/accessControl.cgi?action=openDoor&channel=${this.cfg.equip.canalPorta}`);
  }

  async disponivel() {
    try {
      const r = await fetchDigest(`${this.base}/cgi-bin/global.cgi?action=getCurrentTime`, { usuario: this.cfg.equip.usuario, senha: this.cfg.equip.senha, timeoutMs: 4000 });
      await r.arrayBuffer().catch(() => undefined);
      return r.status < 500;
    } catch {
      return false;
    }
  }
}
