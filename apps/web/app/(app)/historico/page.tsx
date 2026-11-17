import { Download, History } from "lucide-react";
import { formatarDataHora, ROTULO_MOTIVO, type MotivoNegativa } from "@portaria/core";
import { Cabecalho } from "@/components/Cabecalho";
import { Selo } from "@/components/Selo";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";
import { consultaHistorico, filtrarPorNome, type FiltrosHistorico, type LinhaHistorico } from "@/lib/historico";

export const dynamic = "force-dynamic";

const ORIGEM: Record<string, string> = { RECONHECIMENTO_FACIAL: "Facial", BIOMETRIA_DIGITAL: "Digital", MANUAL_PORTEIRO: "Manual", SIMULADOR: "Simulador" };

export default async function Historico({ searchParams }: { searchParams: FiltrosHistorico }) {
  await exigirUsuario();
  const f = searchParams;
  const { data } = await consultaHistorico(supabaseServidor(), f, 500);
  const linhas = filtrarPorNome((data ?? []) as unknown as LinhaHistorico[], f.q);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <Cabecalho titulo="Histórico de Acessos" subtitulo="Todas as entradas, saídas, negativas e falhas registradas." Icone={History} />
      <div className="space-y-5 p-6 lg:p-8">
        <form className="cartao grid items-end gap-4 p-5 md:grid-cols-6">
          <label className="md:col-span-2"><span className="rotulo">Pessoa</span><div className="campo"><input name="q" defaultValue={f.q} placeholder="Nome" /></div></label>
          <label><span className="rotulo">De</span><div className="campo"><input type="date" name="de" defaultValue={f.de} /></div></label>
          <label><span className="rotulo">Até</span><div className="campo"><input type="date" name="ate" defaultValue={f.ate} /></div></label>
          <label><span className="rotulo">Movimento</span><div className="campo"><select name="tipo" defaultValue={f.tipo ?? ""}><option value="">Todos</option><option value="ENTRADA">Entrada</option><option value="SAIDA">Saída</option></select></div></label>
          <label><span className="rotulo">Resultado</span><div className="campo"><select name="resultado" defaultValue={f.resultado ?? ""}><option value="">Todos</option><option value="LIBERADO">Liberado</option><option value="NEGADO">Negado</option><option value="FALHA_TECNICA">Falha técnica</option></select></div></label>
          <div className="flex gap-3 md:col-span-6">
            <button className="btn-primario">Filtrar</button>
            <a className="btn-contorno" href={`/api/historico/csv?${qs}`}><Download className="h-4 w-4" /> Exportar CSV</a>
            <span className="ml-auto self-center text-sm text-suave">{linhas.length} registro(s){linhas.length >= 500 ? " — mostrando os 500 mais recentes" : ""}</span>
          </div>
        </form>
        <div className="cartao overflow-x-auto">
          <table className="tabela">
            <thead><tr><th>Data/hora</th><th>Pessoa</th><th>Movimento</th><th>Resultado</th><th>Motivo</th><th>Origem</th><th>Equipamento / Usuário</th></tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap">{formatarDataHora(l.data_hora)}</td>
                  <td>{l.pessoa?.nome_completo ?? <span className="text-suave">Não identificada</span>}</td>
                  <td><Selo valor={l.tipo_movimento} /></td>
                  <td><Selo valor={l.resultado} /></td>
                  <td className="text-xs">{l.motivo_negativa ? ROTULO_MOTIVO[l.motivo_negativa as MotivoNegativa] : "—"}{l.observacao && <div className="text-suave">{l.observacao}</div>}</td>
                  <td>{ORIGEM[l.origem] ?? l.origem}</td>
                  <td className="text-xs">{l.dispositivo?.nome ?? "—"}{l.usuario && <div className="text-suave">por {l.usuario.nome}</div>}</td>
                </tr>
              ))}
              {!linhas.length && <tr><td colSpan={7} className="py-10 text-center text-suave">Nenhum registro no período.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
