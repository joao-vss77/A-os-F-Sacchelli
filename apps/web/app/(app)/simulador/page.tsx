import { Cpu } from "lucide-react";
import { Cabecalho } from "@/components/Cabecalho";
import { Simulador } from "@/components/Simulador";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PaginaSimulador() {
  await exigirUsuario(["GESTOR", "ADMIN"]);
  const { data } = await supabaseServidor().from("dispositivo").select("id, nome, modo_integracao").neq("situacao", "DESATIVADO").order("modo_integracao", { ascending: false });
  return (
    <>
      <Cabecalho titulo="Simulador de Equipamento" subtitulo="Demonstre o fluxo de reconhecimento e autorização sem o equipamento físico." Icone={Cpu} />
      <div className="p-6 lg:p-8"><Simulador dispositivos={(data ?? []).map((d) => ({ id: d.id, nome: d.nome }))} /></div>
    </>
  );
}
