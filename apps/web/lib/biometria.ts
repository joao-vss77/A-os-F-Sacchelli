import type { SupabaseClient } from "@supabase/supabase-js";
import type { TipoBiometria } from "@portaria/core";

export { BASES_LEGAIS } from "./biometria-constantes";

/**
 * Registra a biometria e enfileira os comandos para o agente local.
 * Dispositivo SIMULADOR: marca como sincronizada na hora (equipamento virtual).
 * A foto só existe no payload do comando; o agente a apaga após enviar ao aparelho.
 */
export async function solicitarBiometriaDb(
  sb: SupabaseClient,
  p: { pessoaId: string; tipo: TipoBiometria; dispositivoId: string; baseLegal: string; fotoBase64?: string },
): Promise<{ ok: boolean; mensagem: string }> {
  const { data: pessoa } = await sb.from("pessoa").select("id, nome_completo, codigo_dispositivo").eq("id", p.pessoaId).single();
  const { data: disp } = await sb.from("dispositivo").select("id, modo_integracao").eq("id", p.dispositivoId).single();
  if (!pessoa || !disp) return { ok: false, mensagem: "Pessoa ou dispositivo não encontrado." };
  if (p.tipo === "FACIAL" && !p.fotoBase64) return { ok: false, mensagem: "Capture a foto do rosto antes de enviar." };

  const simulador = disp.modo_integracao === "SIMULADOR";
  const { error: eBio } = await sb.from("identificacao_biometrica").upsert(
    {
      pessoa_id: p.pessoaId, tipo: p.tipo, base_legal: p.baseLegal,
      consentimento_em: p.baseLegal.startsWith("Consentimento") ? new Date().toISOString() : null,
      situacao: simulador ? "SINCRONIZADA" : "PENDENTE_SINCRONIZACAO",
      referencia_externa: String(pessoa.codigo_dispositivo), ultimo_erro: null, removida_em: null,
    },
    { onConflict: "pessoa_id,tipo" },
  );
  if (eBio) return { ok: false, mensagem: eBio.message };
  if (simulador) return { ok: true, mensagem: "Biometria registrada no equipamento virtual." };

  const usuario = { userId: pessoa.codigo_dispositivo, nome: pessoa.nome_completo };
  const comandos = [
    { dispositivo_id: disp.id, pessoa_id: pessoa.id, tipo: "CADASTRAR_USUARIO", payload: usuario },
    p.tipo === "FACIAL"
      ? { dispositivo_id: disp.id, pessoa_id: pessoa.id, tipo: "CADASTRAR_FACE", payload: { userId: pessoa.codigo_dispositivo, fotoBase64: p.fotoBase64 } }
      : { dispositivo_id: disp.id, pessoa_id: pessoa.id, tipo: "CAPTURAR_DIGITAL", payload: { userId: pessoa.codigo_dispositivo } },
  ];
  const { error } = await sb.from("comando_dispositivo").insert(comandos);
  if (error) return { ok: false, mensagem: error.message };
  return {
    ok: true,
    mensagem: p.tipo === "FACIAL"
      ? "Face enviada para o equipamento. Acompanhe a sincronização na ficha do visitante."
      : "Pedido enviado: posicione o dedo no leitor do equipamento.",
  };
}
