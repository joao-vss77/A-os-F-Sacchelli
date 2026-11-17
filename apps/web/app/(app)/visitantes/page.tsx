import Link from "next/link";
import { Search, UserPlus, Users } from "lucide-react";
import { formatarDataHora, mascararCpf, normalizarCpf } from "@portaria/core";
import { Cabecalho } from "@/components/Cabecalho";
import { Selo } from "@/components/Selo";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Visitantes({ searchParams }: { searchParams: { q?: string } }) {
  await exigirUsuario();
  const q = (searchParams.q ?? "").trim();
  const sb = supabaseServidor();
  let consulta = sb
    .from("pessoa")
    .select("id, nome_completo, cpf, situacao, criado_em, visitante!inner(pessoa_id), visita:visita(empresa_origem, criada_em, situacao), identificacao_biometrica(tipo, situacao)")
    .eq("tipo_pessoa", "VISITANTE")
    .order("nome_completo")
    .limit(100);
  const cpf = normalizarCpf(q);
  if (q) consulta = cpf.length >= 3 && /^\d/.test(q) ? consulta.like("cpf", `${cpf}%`) : consulta.ilike("nome_completo", `%${q}%`);
  const { data } = await consulta;

  return (
    <>
      <Cabecalho titulo="Visitantes" subtitulo="Consulte, atualize e acompanhe os visitantes cadastrados." Icone={Users}
        acoes={<Link href="/visitantes/novo" className="btn-primario relative z-10"><UserPlus className="h-5 w-5" /> Novo visitante</Link>} />
      <div className="space-y-5 p-6 lg:p-8">
        <form className="flex max-w-xl gap-3">
          <div className="campo"><Search /><input name="q" defaultValue={q} placeholder="Buscar por nome ou CPF..." autoFocus /></div>
          <button className="btn-primario">Buscar</button>
        </form>
        <div className="cartao overflow-x-auto">
          <table className="tabela">
            <thead><tr><th>Nome</th><th>CPF</th><th>Última visita</th><th>Empresa</th><th>Biometria</th><th>Situação</th></tr></thead>
            <tbody>
              {(data ?? []).map((p) => {
                const visitas = ((p.visita as unknown as { empresa_origem: string | null; criada_em: string; situacao: string }[]) ?? [])
                  .sort((a, b) => b.criada_em.localeCompare(a.criada_em));
                const bios = (p.identificacao_biometrica as unknown as { tipo: string; situacao: string }[]) ?? [];
                return (
                  <tr key={p.id} className="hover:bg-navy-50/50">
                    <td><Link className="font-semibold text-navy hover:underline" href={`/visitantes/${p.id}`}>{p.nome_completo}</Link></td>
                    <td className="font-mono text-xs">{mascararCpf(p.cpf)}</td>
                    <td>{visitas[0] ? formatarDataHora(visitas[0].criada_em) : "—"}</td>
                    <td>{visitas[0]?.empresa_origem ?? "—"}</td>
                    <td className="space-x-1">{bios.length ? bios.map((b) => <span key={b.tipo} className="text-xs">{b.tipo === "FACIAL" ? "Face" : "Digital"} <Selo valor={b.situacao} /></span>) : "—"}</td>
                    <td><Selo valor={p.situacao} /></td>
                  </tr>
                );
              })}
              {!data?.length && <tr><td colSpan={6} className="py-10 text-center text-suave">Nenhum visitante encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
