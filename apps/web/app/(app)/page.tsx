import Link from "next/link";
import { Ban, LayoutDashboard, MonitorSmartphone, UserCheck, UserPlus, Users } from "lucide-react";
import { inicioDoDiaSP } from "@portaria/core";
import { Cabecalho } from "@/components/Cabecalho";
import { FeedEventos } from "@/components/FeedEventos";
import { SELECT_FEED, type EventoFeed } from "@/lib/feed";
import { GraficoEventos, type PontoHora } from "@/components/GraficoEventos";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Últimas 24 horas no fuso de SP, preenchendo horas sem eventos com zero. */
function montarSerie(linhas: { hora: string; liberados: number; negados: number; falhas: number }[]): PontoHora[] {
  const mapa = new Map(linhas.map((l) => [l.hora.slice(0, 13), l]));
  const fmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
  const serie: PontoHora[] = [];
  for (let i = 23; i >= 0; i--) {
    const chave = fmt.format(new Date(Date.now() - i * 3600_000)).replace(" ", "T"); // yyyy-mm-ddTHH
    const l = mapa.get(chave);
    serie.push({ hora: `${chave.slice(11, 13)}h`, liberados: Number(l?.liberados ?? 0), negados: Number(l?.negados ?? 0), falhas: Number(l?.falhas ?? 0) });
  }
  return serie;
}

function Indicador({ titulo, valor, detalhe, Icone, cor }: { titulo: string; valor: string; detalhe: string; Icone: typeof Users; cor: string }) {
  return (
    <div className="cartao overflow-hidden">
      <div className={`px-5 py-2 text-sm font-semibold text-white ${cor}`}>{titulo}</div>
      <div className="flex items-center justify-between px-5 py-4">
        <div><div className="font-marca text-4xl font-bold text-navy">{valor}</div><div className="text-sm text-suave">{detalhe}</div></div>
        <Icone className="h-12 w-12 text-navy/25" strokeWidth={1.3} />
      </div>
    </div>
  );
}

export default async function Painel() {
  await exigirUsuario();
  const sb = supabaseServidor();
  const hoje = inicioDoDiaSP(new Date()).toISOString();
  const [presentes, visitas, negados, liberados, disps, horas, feed] = await Promise.all([
    sb.from("vw_presentes").select("pessoa_id", { count: "exact", head: true }),
    sb.from("visita").select("id", { count: "exact", head: true }).gte("criada_em", hoje),
    sb.from("registro_acesso").select("id", { count: "exact", head: true }).gte("data_hora", hoje).neq("resultado", "LIBERADO"),
    sb.from("registro_acesso").select("id", { count: "exact", head: true }).gte("data_hora", hoje).eq("resultado", "LIBERADO"),
    sb.from("dispositivo").select("situacao").neq("situacao", "DESATIVADO"),
    sb.from("vw_eventos_hora").select("*"),
    sb.from("registro_acesso").select(SELECT_FEED).order("data_hora", { ascending: false }).limit(15),
  ]);
  const ativos = (disps.data ?? []).filter((d) => d.situacao === "ATIVO").length;

  return (
    <>
      <Cabecalho titulo="Painel da Portaria" subtitulo="Visão em tempo real das entradas e saídas." Icone={LayoutDashboard}
        acoes={<Link href="/visitantes/novo" className="btn-primario relative z-10"><UserPlus className="h-5 w-5" /> Cadastrar visitante</Link>} />
      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Indicador titulo="Pessoas na empresa" valor={String(presentes.count ?? 0)} detalhe="presentes agora" Icone={Users} cor="bg-navy" />
          <Indicador titulo="Visitas hoje" valor={String(visitas.count ?? 0)} detalhe="visitas registradas" Icone={UserCheck} cor="bg-sac-verde" />
          <Indicador titulo="Passagens hoje" valor={`${liberados.count ?? 0}/${negados.count ?? 0}`} detalhe="liberadas / negadas ou falhas" Icone={Ban} cor="bg-sac-vermelho" />
          <Indicador titulo="Equipamentos" valor={`${ativos}/${disps.data?.length ?? 0}`} detalhe="online / total" Icone={MonitorSmartphone} cor="bg-sac-azul" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <section className="cartao p-5">
            <h2 className="mb-3 text-lg font-bold">Eventos — últimas 24 horas</h2>
            <GraficoEventos dados={montarSerie((horas.data ?? []) as never)} />
          </section>
          <div className="h-[420px]"><FeedEventos titulo="Últimas passagens" iniciais={(feed.data ?? []) as unknown as EventoFeed[]} /></div>
        </div>
      </div>
    </>
  );
}
