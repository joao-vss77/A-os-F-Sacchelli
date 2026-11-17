export interface Config {
  nuvemUrl: string;
  token: string;
  dispositivoId: string;
  modo: "INTELBRAS_BIOT" | "SIMULADOR";
  portaHttp: number;
  caminhoEventos: string;
  timeoutNuvemMs: number;
  liberarEmFalha: boolean;
  intervaloFilaMs: number;
  intervaloHeartbeatMs: number;
  equip: { host: string; porta: number; https: boolean; usuario: string; senha: string; canalPorta: number };
}

const num = (v: string | undefined, padrao: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : padrao);

export function carregarConfig(env: Record<string, string | undefined> = process.env): Config {
  const faltando = ["NUVEM_URL", "AGENTE_TOKEN", "DISPOSITIVO_ID"].filter((k) => !env[k]);
  if (faltando.length) throw new Error(`Variáveis obrigatórias ausentes no .env: ${faltando.join(", ")}`);
  const modo = env.MODO === "SIMULADOR" ? "SIMULADOR" : "INTELBRAS_BIOT";
  if (modo === "INTELBRAS_BIOT" && (!env.EQUIP_HOST || !env.EQUIP_USUARIO || !env.EQUIP_SENHA)) {
    throw new Error("Modo INTELBRAS_BIOT exige EQUIP_HOST, EQUIP_USUARIO e EQUIP_SENHA no .env");
  }
  return {
    nuvemUrl: env.NUVEM_URL!.replace(/\/+$/, ""),
    token: env.AGENTE_TOKEN!,
    dispositivoId: env.DISPOSITIVO_ID!,
    modo,
    portaHttp: num(env.PORTA_HTTP, 3080),
    caminhoEventos: env.CAMINHO_EVENTOS || "/notification",
    timeoutNuvemMs: num(env.TIMEOUT_NUVEM_MS, 1500),
    liberarEmFalha: env.LIBERAR_EM_FALHA === "true",
    intervaloFilaMs: num(env.INTERVALO_FILA_MS, 2000),
    intervaloHeartbeatMs: num(env.INTERVALO_HEARTBEAT_MS, 30000),
    equip: {
      host: env.EQUIP_HOST ?? "",
      porta: num(env.EQUIP_PORTA, env.EQUIP_HTTPS === "true" ? 443 : 80),
      https: env.EQUIP_HTTPS === "true",
      usuario: env.EQUIP_USUARIO ?? "",
      senha: env.EQUIP_SENHA ?? "",
      canalPorta: num(env.EQUIP_CANAL_PORTA, 1),
    },
  };
}
