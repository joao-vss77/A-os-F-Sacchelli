import { NextResponse } from "next/server";
import { checarAgente } from "@/lib/agente";
import { registrarDecisao, type MetodoIdentificacao } from "@/lib/decisao";
import { repoSupabase } from "@/lib/decisao-supabase";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const METODOS: MetodoIdentificacao[] = ["FACIAL", "DIGITAL", "OUTRO"];

/** Contrato neutro: o agente traduz o evento Intelbras e pergunta se a pessoa pode passar. */
export async function POST(req: Request) {
  const negado = checarAgente(req);
  if (negado) return negado;
  const b = await req.json().catch(() => null);
  if (!b?.dispositivoId) return NextResponse.json({ erro: "dispositivoId obrigatório" }, { status: 400 });
  try {
    const r = await registrarDecisao(repoSupabase(supabaseAdmin()), {
      dispositivoId: String(b.dispositivoId),
      userId: b.userId == null || b.userId === "" ? null : String(b.userId),
      metodo: METODOS.includes(b.metodo) ? b.metodo : "OUTRO",
      sentido: b.sentido === "ENTRADA" || b.sentido === "SAIDA" ? b.sentido : undefined,
      bruto: b.bruto ?? null,
    });
    return NextResponse.json({ permitido: r.permitido, mensagem: r.mensagem, registroId: r.registroId });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 404 });
  }
}
