import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const MAX_TENTATIVAS = 3;

/** Valida "Authorization: Bearer <AGENTE_TOKEN>". Retorna resposta 401 ou null se ok. */
export function checarAgente(req: Request): NextResponse | null {
  const esperado = process.env.AGENTE_TOKEN ?? "";
  const recebido = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(recebido), b = Buffer.from(esperado);
  if (esperado.length < 16 || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  return null;
}

/** Próxima situação de um comando após o agente reportar o resultado. */
export function proximaSituacaoComando(tentativas: number, ok: boolean): "CONCLUIDO" | "PENDENTE" | "ERRO" {
  if (ok) return "CONCLUIDO";
  return tentativas >= MAX_TENTATIVAS ? "ERRO" : "PENDENTE";
}
