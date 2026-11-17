import { carregarConfig } from "./config.js";
import { Nuvem } from "./nuvem.js";
import { criarServidor } from "./servidor.js";
import { processarFila } from "./fila.js";
import { IntelbrasBioTAdapter } from "./adapters/intelbrasBioT.js";
import { SimuladorAdapter } from "./adapters/simulador.js";

const log = (m: string) => console.log(`${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}  ${m}`);

const cfg = carregarConfig();
const nuvem = new Nuvem(cfg);
const adapter = cfg.modo === "SIMULADOR" ? new SimuladorAdapter(log) : new IntelbrasBioTAdapter(cfg);

criarServidor(cfg, nuvem, log).listen(cfg.portaHttp, "0.0.0.0", () => {
  log(`Agente da portaria no ar — modo ${cfg.modo}, dispositivo "${cfg.dispositivoId}"`);
  log(`Configure no equipamento (Modo Online): servidor = IP deste PC, porta ${cfg.portaHttp}, caminho ${cfg.caminhoEventos}`);
});

let ocupado = false;
setInterval(async () => {
  if (ocupado) return;
  ocupado = true;
  try { await processarFila(nuvem, adapter, log); } catch (e) { log(`fila indisponível: ${(e as Error).message}`); } finally { ocupado = false; }
}, cfg.intervaloFilaMs);

async function batimento() {
  const ok = await adapter.disponivel();
  try { await nuvem.heartbeat(ok); } catch (e) { log(`sem contato com a nuvem: ${(e as Error).message}`); }
  if (!ok) log("equipamento não respondeu ao teste de disponibilidade");
}
batimento();
setInterval(batimento, cfg.intervaloHeartbeatMs);
