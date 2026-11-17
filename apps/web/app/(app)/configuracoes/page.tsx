import Link from "next/link";
import { Settings } from "lucide-react";
import { formatarDataHora, mascararCpf } from "@portaria/core";
import { Cabecalho } from "@/components/Cabecalho";
import { Selo } from "@/components/Selo";
import { BotaoAcao } from "@/components/BotaoAcao";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";
import {
  abrirPortaRemota, alternarCadastro, alternarUsuario, criarFuncionario, criarMotivo, criarSetor, criarUsuario, salvarDispositivo,
} from "./acoes";

export const dynamic = "force-dynamic";

const ABAS = [
  ["usuarios", "Usuários"], ["funcionarios", "Funcionários"], ["setores", "Setores"], ["motivos", "Motivos de visita"], ["dispositivos", "Dispositivos"],
] as const;

function Entrada({ nome, rotulo, tipo = "text", obrig, placeholder, padrao }: { nome: string; rotulo: string; tipo?: string; obrig?: boolean; placeholder?: string; padrao?: string }) {
  return (
    <label className="block">
      <span className={`rotulo ${obrig ? "obrig" : ""}`}>{rotulo}</span>
      <div className="campo"><input name={nome} type={tipo} required={obrig} placeholder={placeholder} defaultValue={padrao} /></div>
    </label>
  );
}
function Escolha({ nome, rotulo, opcoes, padrao }: { nome: string; rotulo: string; opcoes: [string, string][]; padrao?: string }) {
  return (
    <label className="block">
      <span className="rotulo obrig">{rotulo}</span>
      <div className="campo"><select name={nome} defaultValue={padrao}>{opcoes.map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select></div>
    </label>
  );
}

export default async function Configuracoes({ searchParams }: { searchParams: { aba?: string; ok?: string; erro?: string } }) {
  const eu = await exigirUsuario(["ADMIN"]);
  const aba = ABAS.some(([a]) => a === searchParams.aba) ? searchParams.aba! : "usuarios";
  const sb = supabaseServidor();
  const [usuarios, setores, motivos, funcionarios, dispositivos] = await Promise.all([
    sb.from("usuario").select("id, nome, login, ativo, ultimo_login_em, perfil:perfil_id(nome)").order("nome"),
    sb.from("setor").select("id, nome, ativo").order("nome"),
    sb.from("motivo_visita").select("id, descricao, ativo").order("descricao"),
    sb.from("funcionario").select("matricula, setor:setor_id(nome), pessoa:pessoa_id(id, nome_completo, cpf, situacao)").order("matricula"),
    sb.from("dispositivo").select("*").order("nome"),
  ]);

  return (
    <>
      <Cabecalho titulo="Configurações" subtitulo="Usuários, cadastros auxiliares e equipamentos de acesso." Icone={Settings} />
      <div className="p-6 lg:p-8">
        <nav className="mb-6 flex flex-wrap gap-2">
          {ABAS.map(([a, r]) => (
            <Link key={a} href={`/configuracoes?aba=${a}`} className={`rounded-full px-4 py-2 text-sm font-semibold ${aba === a ? "bg-navy text-white" : "bg-white text-navy ring-1 ring-borda"}`}>{r}</Link>
          ))}
        </nav>
        {searchParams.ok && <p className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-sac-verde">{searchParams.ok}</p>}
        {searchParams.erro && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-sac-vermelho">{searchParams.erro}</p>}

        {aba === "usuarios" && (
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="cartao overflow-x-auto">
              <table className="tabela">
                <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Último login</th><th>Situação</th><th></th></tr></thead>
                <tbody>{(usuarios.data ?? []).map((u) => (
                  <tr key={u.id}>
                    <td className="font-semibold">{u.nome}</td><td>{u.login}</td>
                    <td>{(u.perfil as unknown as { nome: string })?.nome}</td>
                    <td>{u.ultimo_login_em ? formatarDataHora(u.ultimo_login_em) : "—"}</td>
                    <td><Selo valor={u.ativo ? "ATIVO" : "INATIVA"} /></td>
                    <td>{u.id !== eu.id && <BotaoAcao acao={alternarUsuario.bind(null, u.id, !u.ativo)} rotulo={u.ativo ? "Desativar" : "Ativar"} />}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <form action={criarUsuario} className="cartao space-y-4 p-6">
              <h2 className="text-lg font-bold">Novo usuário</h2>
              <Entrada nome="nome" rotulo="Nome" obrig />
              <Entrada nome="email" rotulo="E-mail (login)" tipo="email" obrig />
              <Entrada nome="senha" rotulo="Senha inicial (mín. 8)" tipo="password" obrig />
              <Escolha nome="perfil" rotulo="Perfil" opcoes={[["PORTEIRO", "Porteiro"], ["GESTOR", "Gestor (RH/Segurança)"], ["ADMIN", "Administrador"]]} />
              <button className="btn-primario w-full">Criar usuário</button>
            </form>
          </div>
        )}

        {aba === "funcionarios" && (
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="cartao overflow-x-auto">
              <table className="tabela">
                <thead><tr><th>Matrícula</th><th>Nome</th><th>CPF</th><th>Setor</th><th>Situação</th></tr></thead>
                <tbody>{(funcionarios.data ?? []).map((f) => {
                  const p = f.pessoa as unknown as { id: string; nome_completo: string; cpf: string; situacao: string };
                  return (
                    <tr key={p.id}>
                      <td>{f.matricula}</td>
                      <td><Link href={`/visitantes/${p.id}`} className="font-semibold text-navy hover:underline">{p.nome_completo}</Link></td>
                      <td className="font-mono text-xs">{mascararCpf(p.cpf)}</td>
                      <td>{(f.setor as unknown as { nome: string })?.nome}</td>
                      <td><Selo valor={p.situacao} /></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            <form action={criarFuncionario} className="cartao space-y-4 p-6">
              <h2 className="text-lg font-bold">Novo funcionário</h2>
              <Entrada nome="nome" rotulo="Nome completo" obrig />
              <Entrada nome="cpf" rotulo="CPF" obrig placeholder="000.000.000-00" />
              <Entrada nome="email" rotulo="E-mail" tipo="email" />
              <Entrada nome="matricula" rotulo="Matrícula" obrig />
              <Escolha nome="setorId" rotulo="Setor" opcoes={(setores.data ?? []).filter((x) => x.ativo).map((x) => [x.id, x.nome])} />
              <button className="btn-primario w-full">Cadastrar funcionário</button>
              <p className="text-xs text-suave">Funcionários recebem autorização permanente. A biometria é cadastrada na ficha da pessoa.</p>
            </form>
          </div>
        )}

        {(aba === "setores" || aba === "motivos") && (
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="cartao overflow-x-auto">
              <table className="tabela">
                <thead><tr><th>{aba === "setores" ? "Setor" : "Motivo"}</th><th>Situação</th><th></th></tr></thead>
                <tbody>{(aba === "setores"
                  ? (setores.data ?? []).map((x) => ({ id: x.id, nome: x.nome, ativo: x.ativo }))
                  : (motivos.data ?? []).map((x) => ({ id: x.id, nome: x.descricao, ativo: x.ativo }))
                ).map((x) => (
                  <tr key={x.id}>
                    <td>{x.nome}</td><td><Selo valor={x.ativo ? "ATIVO" : "INATIVA"} /></td>
                    <td><BotaoAcao acao={alternarCadastro.bind(null, aba === "setores" ? "setor" : "motivo_visita", x.id, !x.ativo)} rotulo={x.ativo ? "Desativar" : "Ativar"} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <form action={aba === "setores" ? criarSetor : criarMotivo} className="cartao space-y-4 p-6">
              <h2 className="text-lg font-bold">{aba === "setores" ? "Novo setor" : "Novo motivo"}</h2>
              <Entrada nome={aba === "setores" ? "nome" : "descricao"} rotulo="Descrição" obrig />
              <button className="btn-primario w-full">Adicionar</button>
            </form>
          </div>
        )}

        {aba === "dispositivos" && (
          <div className="space-y-6">
            {(dispositivos.data ?? []).map((d) => (
              <form key={d.id} action={salvarDispositivo} className="cartao grid gap-4 p-6 md:grid-cols-3">
                <input type="hidden" name="id" value={d.id} />
                <div className="flex items-center gap-3 md:col-span-3">
                  <h2 className="text-lg font-bold">{d.nome}</h2><Selo valor={d.situacao} />
                  <span className="text-sm text-suave">Último contato: {d.ultimo_contato_em ? formatarDataHora(d.ultimo_contato_em) : "nunca"}</span>
                  {d.modo_integracao !== "SIMULADOR" && <span className="ml-auto"><BotaoAcao acao={abrirPortaRemota.bind(null, d.id)} rotulo="Abrir porta remotamente" confirmar="Liberar a passagem agora?" /></span>}
                </div>
                <Entrada nome="nome" rotulo="Nome" obrig padrao={d.nome} />
                <Entrada nome="identificador" rotulo="Identificador (usado no agente)" obrig padrao={d.identificador_externo ?? ""} />
                <Escolha nome="modo" rotulo="Integração" padrao={d.modo_integracao} opcoes={[["INTELBRAS_BIOT", "Intelbras Bio-T (API/CGI)"], ["SIMULADOR", "Equipamento virtual"]]} />
                <Escolha nome="sentido" rotulo="Sentido" padrao={d.sentido} opcoes={[["BIDIRECIONAL", "Entrada e saída"], ["ENTRADA", "Somente entrada"], ["SAIDA", "Somente saída"]]} />
                <Entrada nome="endereco" rotulo="IP na rede local" padrao={d.endereco_rede ?? ""} placeholder="192.168.1.201" />
                <Entrada nome="localizacao" rotulo="Localização" padrao={d.localizacao ?? ""} />
                <div className="md:col-span-3"><button className="btn-primario">Salvar</button></div>
              </form>
            ))}
            <form action={salvarDispositivo} className="cartao grid gap-4 p-6 md:grid-cols-3">
              <h2 className="text-lg font-bold md:col-span-3">Novo dispositivo</h2>
              <Entrada nome="nome" rotulo="Nome" obrig />
              <Entrada nome="identificador" rotulo="Identificador" obrig placeholder="portaria-02" />
              <Escolha nome="modo" rotulo="Integração" opcoes={[["INTELBRAS_BIOT", "Intelbras Bio-T (API/CGI)"], ["SIMULADOR", "Equipamento virtual"]]} />
              <Escolha nome="sentido" rotulo="Sentido" opcoes={[["BIDIRECIONAL", "Entrada e saída"], ["ENTRADA", "Somente entrada"], ["SAIDA", "Somente saída"]]} />
              <Entrada nome="endereco" rotulo="IP na rede local" />
              <Entrada nome="localizacao" rotulo="Localização" />
              <div className="md:col-span-3"><button className="btn-primario">Adicionar</button></div>
            </form>
            <p className="text-sm text-suave">A senha do equipamento fica somente no arquivo <code>.env</code> do agente local, nunca no banco.</p>
          </div>
        )}
      </div>
    </>
  );
}
