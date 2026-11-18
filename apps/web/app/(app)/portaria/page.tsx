import Link from "next/link";
import { DoorOpen, LogOut } from "lucide-react";
import { formatarDataHora } from "@portaria/core";
import { Cabecalho } from "@/components/Cabecalho";
import { BotaoAcao } from "@/components/BotaoAcao";
import { FeedEventos } from "@/components/FeedEventos";
import { SELECT_FEED, type EventoFeed } from "@/lib/feed";
import { RegistroManual } from "@/components/RegistroManual";
import { Selo } from "@/components/Selo";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";
import { registrarManual } from "./acoes";

export const dynamic = "force-dynamic";

export default async function Portaria() {
  await exigirUsuario();
  const sb = supabaseServidor();
  const [{ data: presentes }, { data: alertas }, { data: disps }] = await Promise.all([
    sb.from("vw_presentes").select("*").order("entrada_em", { ascending: false }),
    sb.from("registro_acesso").select(SELECT_FEED).neq("resultado", "LIBERADO").order("data_hora", { ascending: false }).limit(15),
    sb.from("dispositivo").select("id, nome, situacao, ultimo_contato_em").neq("situacao", "DESATIVADO").order("nome"),
  ]);

  return (
    <>
      <Cabecalho titulo="Portaria" subtitulo="Quem está na empresa, alertas e registro manual de contingência." Icone={DoorOpen} />
      <div className="grid gap-6 p-6 lg:p-8 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <RegistroManual />
          <section className="cartao overflow-x-auto">
            <div className="flex items-center justify-between px-6 pt-5">
              <h2 className="text-lg font-bold">Pessoas na empresa ({presentes?.length ?? 0})</h2>
            </div>
            <table className="tabela mt-3">
              <thead><tr><th>Nome</th><th>Tipo</th><th>Entrada</th><th></th></tr></thead>
              <tbody>
                {(presentes ?? []).map((p) => (
                  <tr key={p.pessoa_id}>
                    <td><Link href={`/visitantes/${p.pessoa_id}`} className="font-semibold text-navy hover:underline">{p.nome_completo}</Link></td>
                    <td>{p.tipo_pessoa === "FUNCIONARIO" ? "Funcionário" : "Visitante"}</td>
                    <td>{formatarDataHora(p.entrada_em)}</td>
                    <td className="text-right">
                      <BotaoAcao acao={registrarManual.bind(null, p.pessoa_id, "SAIDA", "Saída registrada pelo porteiro")}
                        rotulo={<><LogOut className="h-4 w-4" /> Registrar saída</>} confirmar={`Registrar a saída de ${p.nome_completo}?`} />
                    </td>
                  </tr>
                ))}
                {!presentes?.length && <tr><td colSpan={4} className="py-8 text-center text-suave">Ninguém registrado dentro da empresa.</td></tr>}
              </tbody>
            </table>
          </section>
        </div>
        <div className="space-y-6">
          <section className="cartao p-5">
            <h2 className="mb-3 text-lg font-bold">Equipamentos</h2>
            <ul className="space-y-2 text-sm">
              {(disps ?? []).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3">
                  <span className="font-medium">{d.nome}</span>
                  <span className="flex items-center gap-2 text-xs text-suave">{d.ultimo_contato_em ? formatarDataHora(d.ultimo_contato_em) : ""} <Selo valor={d.situacao} /></span>
                </li>
              ))}
            </ul>
          </section>
          <div className="h-[560px]"><FeedEventos titulo="Alertas (negados e falhas)" soAlertas iniciais={(alertas ?? []) as unknown as EventoFeed[]} /></div>
        </div>
      </div>
    </>
  );
}
