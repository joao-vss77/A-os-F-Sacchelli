import { notFound } from "next/navigation";
import { UserRound } from "lucide-react";
import { formatarCpf, formatarDataHora, ROTULO_MOTIVO, type MotivoNegativa } from "@portaria/core";
import { Cabecalho } from "@/components/Cabecalho";
import { Selo } from "@/components/Selo";
import { BotaoAcao } from "@/components/BotaoAcao";
import { PainelBiometria } from "@/components/PainelBiometria";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";
import { alterarSituacaoPessoa, removerBiometria, renovarAutorizacaoHoje, revogarAutorizacao } from "./acoes";

export const dynamic = "force-dynamic";

export default async function FichaVisitante({ params }: { params: { id: string } }) {
  const u = await exigirUsuario();
  const sb = supabaseServidor();
  const [{ data: p }, { data: visitas }, { data: auts }, { data: bios }, { data: acessos }, { data: disps }] = await Promise.all([
    sb.from("pessoa").select("*, visitante(cep, logradouro_numero, complemento)").eq("id", params.id).maybeSingle(),
    sb.from("visita").select("id, criada_em, encerrada_em, situacao, empresa_origem, placa_veiculo, motivo:motivo_visita_id(descricao), setor:setor_visitado_id(nome), func:funcionario_visitado_id(pessoa:pessoa_id(nome_completo))")
      .eq("visitante_id", params.id).order("criada_em", { ascending: false }).limit(20),
    sb.from("autorizacao_acesso").select("id, valido_de, valido_ate, situacao, motivo_revogacao").eq("pessoa_id", params.id).order("criada_em", { ascending: false }).limit(10),
    sb.from("identificacao_biometrica").select("tipo, situacao, base_legal, ultimo_erro, criado_em").eq("pessoa_id", params.id),
    sb.from("registro_acesso").select("id, data_hora, tipo_movimento, resultado, motivo_negativa, origem").eq("pessoa_id", params.id).order("data_hora", { ascending: false }).limit(15),
    sb.from("dispositivo").select("id, nome, modo_integracao").neq("situacao", "DESATIVADO").order("nome"),
  ]);
  if (!p) notFound();
  const v = p.visitante as unknown as { cep: string | null; logradouro_numero: string | null; complemento: string | null } | null;
  const gestor = u.perfil !== "PORTEIRO";
  const agora = Date.now();

  return (
    <>
      <Cabecalho titulo={p.nome_completo} subtitulo={`CPF ${formatarCpf(p.cpf)} · código no equipamento ${p.codigo_dispositivo}`} Icone={UserRound} />
      <div className="grid gap-6 p-6 lg:p-8 xl:grid-cols-[1fr_1.2fr]">
        <section className="cartao p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Dados</h2>
            <Selo valor={p.situacao} />
          </div>
          <dl className="grid grid-cols-[130px_1fr] gap-y-2 text-sm">
            <dt className="text-suave">E-mail</dt><dd>{p.email ?? "—"}</dd>
            <dt className="text-suave">Telefone</dt><dd>{p.telefone ?? "—"}</dd>
            <dt className="text-suave">Endereço</dt><dd>{[v?.logradouro_numero, v?.complemento].filter(Boolean).join(" — ") || "—"}{v?.cep ? ` · CEP ${v.cep}` : ""}</dd>
            <dt className="text-suave">Cadastro</dt><dd>{formatarDataHora(p.criado_em)}</dd>
          </dl>
          {gestor && (
            <div className="mt-5">
              {p.situacao === "BLOQUEADA"
                ? <BotaoAcao acao={alterarSituacaoPessoa.bind(null, p.id, "ATIVA")} rotulo="Desbloquear pessoa" confirmar="Desbloquear esta pessoa?" />
                : <BotaoAcao acao={alterarSituacaoPessoa.bind(null, p.id, "BLOQUEADA")} rotulo="Bloquear pessoa" classe="btn-perigo h-9 px-3 text-sm" confirmar="Bloquear impede qualquer acesso desta pessoa. Confirmar?" />}
            </div>
          )}

          <h3 className="mt-7 font-bold">Autorizações</h3>
          <ul className="mt-2 divide-y divide-borda text-sm">
            {(auts ?? []).map((a) => {
              const vigente = a.situacao === "ATIVA" && new Date(a.valido_de).getTime() <= agora && (!a.valido_ate || new Date(a.valido_ate).getTime() >= agora);
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-3 py-2">
                  <Selo valor={vigente ? "ATIVA" : a.situacao === "ATIVA" ? "EXPIRADA" : a.situacao} />
                  <span>{formatarDataHora(a.valido_de)} → {a.valido_ate ? formatarDataHora(a.valido_ate) : "sem término"}</span>
                  {a.motivo_revogacao && <span className="text-suave">({a.motivo_revogacao})</span>}
                  {a.situacao === "ATIVA" && (
                    <span className="ml-auto"><BotaoAcao acao={revogarAutorizacao.bind(null, a.id, p.id)} rotulo="Revogar" pedirTexto="Motivo da revogação:" /></span>
                  )}
                </li>
              );
            })}
            {!auts?.length && <li className="py-2 text-suave">Nenhuma autorização.</li>}
          </ul>
          <div className="mt-3"><BotaoAcao acao={renovarAutorizacaoHoje.bind(null, p.id)} rotulo="Renovar acesso até 23:59 de hoje" /></div>

          <h3 className="mt-7 font-bold">Biometrias</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {(bios ?? []).map((b) => (
              <li key={b.tipo} className="flex flex-wrap items-center gap-2">
                <b>{b.tipo === "FACIAL" ? "Face" : "Digital"}</b> <Selo valor={b.situacao} />
                <span className="text-xs text-suave">{b.base_legal}</span>
                {b.ultimo_erro && <span className="w-full text-xs text-sac-vermelho">{b.ultimo_erro}</span>}
              </li>
            ))}
            {!bios?.length && <li className="text-suave">Nenhuma biometria cadastrada.</li>}
          </ul>
          {!!bios?.some((b) => b.situacao !== "REMOVIDA") && (
            <div className="mt-3"><BotaoAcao acao={removerBiometria.bind(null, p.id)} rotulo="Remover biometria dos equipamentos" confirmar="Remover face e digital desta pessoa dos equipamentos?" /></div>
          )}
        </section>

        <div className="space-y-6">
          <PainelBiometria pessoaId={p.id} dispositivos={disps ?? []} />
          <section className="cartao overflow-x-auto">
            <h2 className="px-6 pt-5 text-xl font-bold">Visitas</h2>
            <table className="tabela mt-3">
              <thead><tr><th>Data</th><th>Motivo</th><th>Visitado</th><th>Empresa / Placa</th><th>Situação</th></tr></thead>
              <tbody>
                {(visitas ?? []).map((x) => {
                  const r = x as unknown as { motivo: { descricao: string } | null; setor: { nome: string } | null; func: { pessoa: { nome_completo: string } } | null };
                  return (
                    <tr key={x.id}>
                      <td>{formatarDataHora(x.criada_em)}</td>
                      <td>{r.motivo?.descricao}</td>
                      <td>{r.func?.pessoa.nome_completo ?? r.setor?.nome}</td>
                      <td>{[x.empresa_origem, x.placa_veiculo].filter(Boolean).join(" · ") || "—"}</td>
                      <td><Selo valor={x.situacao} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
          <section className="cartao overflow-x-auto">
            <h2 className="px-6 pt-5 text-xl font-bold">Últimos acessos</h2>
            <table className="tabela mt-3">
              <thead><tr><th>Data/hora</th><th>Movimento</th><th>Resultado</th><th>Origem</th></tr></thead>
              <tbody>
                {(acessos ?? []).map((a) => (
                  <tr key={a.id}>
                    <td>{formatarDataHora(a.data_hora)}</td>
                    <td><Selo valor={a.tipo_movimento} /></td>
                    <td><Selo valor={a.resultado} /> {a.motivo_negativa && <span className="text-xs text-suave">{ROTULO_MOTIVO[a.motivo_negativa as MotivoNegativa]}</span>}</td>
                    <td className="text-xs">{a.origem.replace(/_/g, " ").toLowerCase()}</td>
                  </tr>
                ))}
                {!acessos?.length && <tr><td colSpan={4} className="py-6 text-center text-suave">Sem acessos registrados.</td></tr>}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </>
  );
}
