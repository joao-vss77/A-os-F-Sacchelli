import { NextResponse } from "next/server";
import { checarAgente } from "@/lib/agente";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Entrega ao agente os comandos pendentes do dispositivo (máx. 5) e os marca como EXECUTANDO. */
export async function GET(req: Request) {
  const negado = checarAgente(req);
  if (negado) return negado;
  const chave = new URL(req.url).searchParams.get("dispositivo") ?? "";
  const sb = supabaseAdmin();
  const { data: disp } = await sb.from("dispositivo").select("id").eq("identificador_externo", chave).maybeSingle();
  if (!disp) return NextResponse.json({ erro: "dispositivo não encontrado" }, { status: 404 });

  // comandos travados em EXECUTANDO há mais de 2 min voltam para a fila
  await sb.from("comando_dispositivo").update({ situacao: "PENDENTE" }).eq("dispositivo_id", disp.id).eq("situacao", "EXECUTANDO")
    .lt("executado_em", new Date(Date.now() - 120_000).toISOString());

  const { data: pendentes } = await sb.from("comando_dispositivo").select("id, tipo, payload, tentativas")
    .eq("dispositivo_id", disp.id).eq("situacao", "PENDENTE").order("criado_em").limit(5);
  const lista = pendentes ?? [];
  for (const c of lista) {
    await sb.from("comando_dispositivo")
      .update({ situacao: "EXECUTANDO", tentativas: c.tentativas + 1, executado_em: new Date().toISOString() })
      .eq("id", c.id);
  }
  return NextResponse.json({ dispositivoId: disp.id, comandos: lista.map((c) => ({ id: c.id, tipo: c.tipo, payload: c.payload })) });
}
