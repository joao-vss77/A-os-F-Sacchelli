import { NextResponse } from "next/server";
import { checarAgente } from "@/lib/agente";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** O agente informa periodicamente se o equipamento responde. */
export async function POST(req: Request) {
  const negado = checarAgente(req);
  if (negado) return negado;
  const b = await req.json().catch(() => ({}));
  const sb = supabaseAdmin();
  const { data: disp } = await sb.from("dispositivo").select("id, situacao").eq("identificador_externo", String(b.dispositivoId ?? "")).maybeSingle();
  if (!disp) return NextResponse.json({ erro: "dispositivo não encontrado" }, { status: 404 });
  const nova = b.disponivel ? "ATIVO" : "INDISPONIVEL";
  await sb.from("dispositivo").update({ situacao: nova, ultimo_contato_em: new Date().toISOString() }).eq("id", disp.id);
  if (disp.situacao !== nova) {
    await sb.from("evento_dispositivo").insert({
      dispositivo_id: disp.id, tipo_evento: b.disponivel ? "AGENTE_CONECTADO" : "DISPOSITIVO_INDISPONIVEL", sucesso: !!b.disponivel, detalhe: { anterior: disp.situacao },
    });
  }
  return NextResponse.json({ situacao: nova });
}
