import { NextResponse } from "next/server";
import { checarAgente, proximaSituacaoComando } from "@/lib/agente";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const BIOMETRICOS: Record<string, "FACIAL" | "DIGITAL"> = { CADASTRAR_FACE: "FACIAL", CAPTURAR_DIGITAL: "DIGITAL" };

/** Resultado da execução de um comando pelo agente. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const negado = checarAgente(req);
  if (negado) return negado;
  const b = (await req.json().catch(() => ({}))) as { ok?: boolean; erro?: string; referenciaExterna?: string };
  const sb = supabaseAdmin();
  const { data: c } = await sb.from("comando_dispositivo").select("id, tipo, tentativas, payload, pessoa_id, dispositivo_id").eq("id", params.id).maybeSingle();
  if (!c) return NextResponse.json({ erro: "comando não encontrado" }, { status: 404 });

  const situacao = proximaSituacaoComando(c.tentativas, !!b.ok);
  const final = situacao !== "PENDENTE";
  // LGPD: a foto sai do banco assim que o comando termina (sucesso ou erro definitivo)
  let payload = c.payload as Record<string, unknown> | null;
  if (final && payload && "fotoBase64" in payload) {
    const { fotoBase64: _removida, ...resto } = payload;
    payload = { ...resto, fotoRemovida: true };
  }
  await sb.from("comando_dispositivo")
    .update({ situacao, erro: b.ok ? null : (b.erro ?? "erro desconhecido").slice(0, 500), payload, executado_em: new Date().toISOString() })
    .eq("id", c.id);

  const tipoBio = BIOMETRICOS[c.tipo];
  if (tipoBio && c.pessoa_id && final) {
    await sb.from("identificacao_biometrica").update(
      b.ok
        ? { situacao: "SINCRONIZADA", ultimo_erro: null, ...(b.referenciaExterna ? { referencia_externa: b.referenciaExterna } : {}) }
        : { situacao: "ERRO_SINCRONIZACAO", ultimo_erro: (b.erro ?? "").slice(0, 500) },
    ).eq("pessoa_id", c.pessoa_id).eq("tipo", tipoBio);
  }
  if (c.tipo === "REMOVER_USUARIO" && b.ok && c.pessoa_id) {
    await sb.from("identificacao_biometrica").update({ situacao: "REMOVIDA", removida_em: new Date().toISOString() }).eq("pessoa_id", c.pessoa_id);
  }
  await sb.from("evento_dispositivo").insert({
    dispositivo_id: c.dispositivo_id,
    tipo_evento: tipoBio ? "SINCRONIZACAO_BIOMETRICA" : "COMANDO_CONFIRMADO",
    sucesso: !!b.ok,
    detalhe: { comando: c.tipo, erro: b.erro ?? null, situacao },
  });
  return NextResponse.json({ situacao });
}
