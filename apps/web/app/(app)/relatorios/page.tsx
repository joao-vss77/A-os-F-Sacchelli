import { BarChart3, Printer } from "lucide-react";
import { ROTULO_MOTIVO, type MotivoNegativa } from "@portaria/core";
import { Cabecalho } from "@/components/Cabecalho";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function contar<T>(itens: T[], chave: (x: T) => string | null | undefined) {
  const m = new Map<string, number>();
  for (const i of itens) { const k = chave(i) ?? "—"; m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function Ranking({ titulo, dados, cor = "bg-navy" }: { titulo: string; dados: [string, number][]; cor?: string }) {
  const max = Math.max(1, ...dados.map((d) => d[1]));
  return (
    <section className="cartao break-inside-avoid p-5">
      <h2 className="mb-4 text-lg font-bold">{titulo}</h2>
      <ul className="space-y-2.5">
        {dados.slice(0, 8).map(([k, v]) => (
          <li key={k}>
            <div className="flex justify-between text-sm"><span>{k}</span><b>{v}</b></div>
            <div className="mt-1 h-2 rounded-full bg-navy-50"><div className={`h-2 rounded-full ${cor}`} style={{ width: `${(v / max) * 100}%` }} /></div>
          </li>
        ))}
        {!dados.length && <li className="text-sm text-suave">Sem dados no período.</li>}
      </ul>
    </section>
  );
}

export default async function Relatorios({ searchParams }: { searchParams: { dias?: string } }) {
  await exigirUsuario(["GESTOR", "ADMIN"]);
  const dias = [7, 30, 90].includes(Number(searchParams.dias)) ? Number(searchParams.dias) : 30;
  const desde = new Date(Date.now() - dias * 86400_000).toISOString();
  const sb = supabaseServidor();
  const [{ data: acessos }, { data: visitas }] = await Promise.all([
    sb.from("registro_acesso").select("resultado, motivo_negativa, origem, tipo_movimento").gte("data_hora", desde).limit(20000),
    sb.from("visita").select("empresa_origem, motivo:motivo_visita_id(descricao), setor:setor_visitado_id(nome), func:funcionario_visitado_id(pessoa:pessoa_id(nome_completo))").gte("criada_em", desde).limit(20000),
  ]);
  const a = acessos ?? [], v = (visitas ?? []) as unknown as { empresa_origem: string | null; motivo: { descricao: string } | null; setor: { nome: string } | null; func: { pessoa: { nome_completo: string } } | null }[];
  const total = a.length, lib = a.filter((x) => x.resultado === "LIBERADO").length, neg = a.filter((x) => x.resultado === "NEGADO").length;

  return (
    <>
      <Cabecalho titulo="Relatórios" subtitulo={`Indicadores dos últimos ${dias} dias.`} Icone={BarChart3} />
      <div className="space-y-6 p-6 lg:p-8">
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {[7, 30, 90].map((d) => <a key={d} href={`?dias=${d}`} className={`rounded-full px-4 py-2 text-sm font-semibold ${d === dias ? "bg-navy text-white" : "bg-white text-navy ring-1 ring-borda"}`}>{d} dias</a>)}
          <span className="ml-auto text-sm text-suave">Imprima ou salve em PDF pelo navegador (Ctrl+P)</span>
          <Printer className="h-5 w-5 text-suave" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[["Passagens", total], ["Liberadas", lib], ["Negadas", neg], ["Visitas", v.length]].map(([t, n]) => (
            <div key={t} className="cartao p-5"><div className="text-sm text-suave">{t}</div><div className="font-marca text-4xl font-bold text-navy">{n}</div></div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <Ranking titulo="Motivos de negativa" cor="bg-sac-vermelho" dados={contar(a.filter((x) => x.motivo_negativa), (x) => ROTULO_MOTIVO[x.motivo_negativa as MotivoNegativa])} />
          <Ranking titulo="Forma de identificação" cor="bg-sac-azul" dados={contar(a, (x) => ({ RECONHECIMENTO_FACIAL: "Facial", BIOMETRIA_DIGITAL: "Digital", MANUAL_PORTEIRO: "Manual", SIMULADOR: "Simulador" } as Record<string, string>)[x.origem])} />
          <Ranking titulo="Motivos de visita" cor="bg-sac-verde" dados={contar(v, (x) => x.motivo?.descricao)} />
          <Ranking titulo="Setores / pessoas mais visitados" dados={contar(v, (x) => x.func?.pessoa.nome_completo ?? x.setor?.nome)} />
          <Ranking titulo="Empresas de origem" cor="bg-sac-amarelo" dados={contar(v.filter((x) => x.empresa_origem), (x) => x.empresa_origem)} />
        </div>
      </div>
    </>
  );
}
