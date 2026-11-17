import { UserPlus } from "lucide-react";
import { Cabecalho } from "@/components/Cabecalho";
import { CadastroVisitanteForm } from "@/components/CadastroVisitanteForm";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";

export default async function NovoVisitante() {
  await exigirUsuario(["PORTEIRO", "GESTOR", "ADMIN"]);
  const sb = supabaseServidor();
  const [f, s, m, d] = await Promise.all([
    sb.from("funcionario").select("pessoa_id, pessoa:pessoa_id(nome_completo, situacao)"),
    sb.from("setor").select("id, nome").eq("ativo", true).order("nome"),
    sb.from("motivo_visita").select("id, descricao").eq("ativo", true).order("descricao"),
    sb.from("dispositivo").select("id, nome, modo_integracao").neq("situacao", "DESATIVADO").order("nome"),
  ]);
  const funcionarios = (f.data ?? [])
    .map((x) => ({ id: x.pessoa_id as string, nome: (x.pessoa as unknown as { nome_completo: string } | null)?.nome_completo ?? "" }))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <>
      <Cabecalho titulo="Cadastro de Visitantes" subtitulo="Registre as informações do visitante para controle de acesso." Icone={UserPlus} />
      <div className="p-6 lg:p-8">
        <CadastroVisitanteForm
          funcionarios={funcionarios}
          setores={(s.data ?? []).map((x) => ({ id: x.id, nome: x.nome }))}
          motivos={(m.data ?? []).map((x) => ({ id: x.id, nome: x.descricao }))}
          dispositivos={d.data ?? []}
        />
      </div>
    </>
  );
}
