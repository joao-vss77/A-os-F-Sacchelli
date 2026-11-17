import { NextResponse } from "next/server";
import { checarAgente } from "@/lib/agente";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const TIPOS = ["FALHA_COMUNICACAO", "DISPOSITIVO_INDISPONIVEL", "COMANDO_ENVIADO", "AGENTE_CONECTADO", "IDENTIFICACAO_RECEBIDA"];

/** Eventos técnicos reportados pelo agente (falhas, conexão, payloads não reconhecidos). */
export async function POST(req: Request) {
  const negado = checarAgente(req);
  if (negado) return negado;
  const b = await req.json().catch(() => null);
  if (!b || !TIPOS.includes(b.tipo)) return NextResponse.json({ erro: "tipo inválido" }, { status: 400 });
  const sb = supabaseAdmin();
  const { data: disp } = await sb.from("dispositivo").select("id").eq("identificador_externo", String(b.dispositivoId ?? "")).maybeSingle();
  await sb.from("evento_dispositivo").insert({ dispositivo_id: disp?.id ?? null, tipo_evento: b.tipo, sucesso: !!b.sucesso, detalhe: b.detalhe ?? null });
  return NextResponse.json({ ok: true });
}
