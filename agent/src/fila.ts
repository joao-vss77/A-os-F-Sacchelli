import type { ControleAcessoAdapter } from "./adapters/tipos.js";
import type { Nuvem, Comando } from "./nuvem.js";

type Log = (m: string) => void;

async function executar(c: Comando, a: ControleAcessoAdapter): Promise<void> {
  const p = c.payload ?? {};
  const userId = Number(p.userId);
  switch (c.tipo) {
    case "CADASTRAR_USUARIO": return a.cadastrarUsuario({ userId, nome: String(p.nome ?? "") });
    case "CADASTRAR_FACE": return a.cadastrarFace(userId, String(p.fotoBase64 ?? ""));
    case "CAPTURAR_DIGITAL": return a.capturarDigital(userId);
    case "REMOVER_USUARIO": return a.removerUsuario(userId);
    case "ABRIR_PORTA": return a.abrirPorta();
    default: throw new Error(`Comando desconhecido: ${c.tipo}`);
  }
}

/** Busca e executa os comandos pendentes; cada resultado volta para a nuvem (que controla as tentativas). */
export async function processarFila(nuvem: Nuvem, adapter: ControleAcessoAdapter, log: Log): Promise<void> {
  const comandos = await nuvem.buscarComandos();
  for (const c of comandos) {
    try {
      await executar(c, adapter);
      log(`comando ${c.tipo} executado`);
      await nuvem.reportarComando(c.id, { ok: true });
    } catch (e) {
      const erro = (e as Error).message;
      log(`comando ${c.tipo} falhou: ${erro}`);
      await nuvem.reportarComando(c.id, { ok: false, erro }).catch(() => {});
    }
  }
}
