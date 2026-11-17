"use client";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  AlignLeft, Building2, Car, CheckCircle2, Eraser, Home, IdCard, Info, Loader2, Mail, MapPin, Phone, Puzzle, Save,
  Search, ShieldCheck, User, Users, X,
} from "lucide-react";
import { cpfValido } from "@portaria/core";
import { validarFormularioVisitante, type DadosVisitante, type ErrosVisitante } from "@/lib/validacao";
import { buscarPorCpf, salvarVisitanteEVisita, type EstadoCadastro } from "@/app/(app)/visitantes/actions";
import { PainelBiometria, type DispositivoOpcao } from "./PainelBiometria";

interface Opcao { id: string; nome: string }

const VAZIO: DadosVisitante = {
  nome: "", cpf: "", email: "", telefone: "", cep: "", logradouroNumero: "", complemento: "", empresaOrigem: "",
  visitadoTipo: "SETOR", visitadoId: "", motivoId: "", placa: "",
};

const mascaraTelefone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
const mascaraCpf = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};
const mascaraCep = (v: string) => v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");

function Campo({ id, rotulo, obrig, erro, Icone, children, extra, leitura }: {
  id: string; rotulo: React.ReactNode; obrig?: boolean; erro?: string; Icone: typeof User; children: React.ReactNode; extra?: React.ReactNode; leitura?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className={`rotulo ${obrig ? "obrig" : ""}`}>{rotulo}</label>
      <div className="flex">
        <div className={`campo ${erro ? "erro" : ""} ${leitura ? "leitura" : ""} ${extra ? "rounded-r-none" : ""}`}><Icone />{children}</div>
        {extra}
      </div>
      {erro && <p className="msg-erro">{erro}</p>}
    </div>
  );
}

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primario h-12 px-8 text-base" disabled={pending}>
      {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Cadastrar Visitante
    </button>
  );
}

export function CadastroVisitanteForm({ funcionarios, setores, motivos, dispositivos }: {
  funcionarios: Opcao[]; setores: Opcao[]; motivos: Opcao[]; dispositivos: DispositivoOpcao[];
}) {
  const router = useRouter();
  const [d, setD] = useState<DadosVisitante>(VAZIO);
  const [errosCliente, setErrosCliente] = useState<ErrosVisitante>({});
  const [estado, acao] = useFormState<EstadoCadastro | null, FormData>(salvarVisitanteEVisita, null);
  const [aviso, setAviso] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const erros = { ...(estado && !estado.ok ? estado.erros : {}), ...errosCliente };
  const set = (k: keyof DadosVisitante, v: string) => {
    setD((x) => ({ ...x, [k]: v }));
    setErrosCliente((e) => ({ ...e, [k]: undefined }));
  };

  useEffect(() => { document.getElementById("cpf")?.focus(); }, []);

  async function aoSairCpf() {
    if (!cpfValido(d.cpf)) return;
    const p = await buscarPorCpf(d.cpf);
    if (!p) return setAviso("");
    if (p.tipo === "FUNCIONARIO") return setAviso("Este CPF é de um funcionário. Funcionários não precisam de cadastro de visita.");
    setD((x) => ({ ...x, nome: p.nome, email: p.email, telefone: p.telefone, cep: mascaraCep(p.cep), logradouroNumero: p.logradouroNumero, complemento: p.complemento }));
    setAviso(p.situacao === "BLOQUEADA" ? "Atenção: pessoa BLOQUEADA. Procure o gestor." : "Visitante já cadastrado — dados preenchidos. Confira e registre a nova visita.");
  }

  async function buscarCep() {
    const cep = d.cep.replace(/\D/g, "");
    if (cep.length !== 8) return setErrosCliente((e) => ({ ...e, cep: "CEP inválido" }));
    setBuscandoCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await r.json();
      if (j.erro) setErrosCliente((e) => ({ ...e, cep: "CEP não encontrado" }));
      else set("logradouroNumero", `${j.logradouro}${j.bairro ? `, ${j.bairro}` : ""} - ${j.localidade}/${j.uf}, Nº `);
      document.getElementById("logradouroNumero")?.focus();
    } catch {
      setErrosCliente((e) => ({ ...e, cep: "Serviço de CEP indisponível; preencha o endereço manualmente" }));
    } finally {
      setBuscandoCep(false);
    }
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    const v = validarFormularioVisitante(d);
    if (Object.keys(v).length) {
      e.preventDefault();
      setErrosCliente(v);
      document.getElementById(Object.keys(v)[0])?.focus();
    }
  }

  function limpar() {
    setD(VAZIO); setErrosCliente({}); setAviso("");
    formRef.current?.reset();
    document.getElementById("cpf")?.focus();
  }

  if (estado?.ok) {
    return (
      <div className="space-y-6">
        <div className="cartao flex flex-wrap items-center gap-4 p-6">
          <CheckCircle2 className="h-10 w-10 text-sac-verde" />
          <div className="flex-1">
            <p className="text-lg font-bold text-navy">{estado.nome}</p>
            <p className="text-suave">{estado.mensagem}</p>
          </div>
          <button className="btn-contorno" onClick={() => router.push(`/visitantes/${estado.pessoaId}`)}>Ver ficha</button>
          <button className="btn-primario" onClick={() => window.location.assign("/visitantes/novo")}>Novo cadastro</button>
        </div>
        <PainelBiometria pessoaId={estado.pessoaId} dispositivos={dispositivos} />
      </div>
    );
  }

  const valorVisitado = d.visitadoId ? `${d.visitadoTipo === "FUNCIONARIO" ? "F" : "S"}:${d.visitadoId}` : "";

  return (
    <form ref={formRef} action={acao} onSubmit={enviar} noValidate className="cartao p-7">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy"><User className="h-8 w-8 text-white" /></div>
        <h2 className="text-[28px] font-bold">Dados do Visitante</h2>
        <div className="ml-4 h-0.5 flex-1 bg-navy/80" />
      </div>

      {aviso && <p className="mb-5 flex items-center gap-2 rounded-lg bg-navy-50 px-4 py-2.5 text-sm text-navy"><Info className="h-4 w-4" />{aviso}</p>}

      <div className="grid gap-x-7 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
        <Campo id="nome" rotulo="Nome Completo" obrig erro={erros.nome} Icone={User}>
          <input id="nome" name="nome" value={d.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Digite o nome completo..." autoComplete="off" />
        </Campo>
        <Campo id="cpf" rotulo="CPF" obrig erro={erros.cpf} Icone={IdCard}>
          <input id="cpf" name="cpf" inputMode="numeric" value={d.cpf} onChange={(e) => set("cpf", mascaraCpf(e.target.value))} onBlur={aoSairCpf} placeholder="000.000.000-00" />
          {cpfValido(d.cpf) && <CheckCircle2 className="!h-6 !w-6 !text-sac-verde" aria-label="CPF válido" />}
        </Campo>
        <Campo id="email" rotulo="E-mail" obrig erro={erros.email} Icone={Mail}>
          <input id="email" name="email" type="email" value={d.email} onChange={(e) => set("email", e.target.value)} placeholder="exemplo@email.com" />
        </Campo>
        <Campo id="telefone" rotulo="Telefone / Celular" erro={erros.telefone} Icone={Phone}>
          <input id="telefone" name="telefone" inputMode="tel" value={d.telefone} onChange={(e) => set("telefone", mascaraTelefone(e.target.value))} placeholder="(11) 98765-4321" />
        </Campo>
        <Campo id="cep" rotulo="CEP" obrig erro={erros.cep} Icone={MapPin}
          extra={<button type="button" onClick={buscarCep} className="flex h-12 w-16 items-center justify-center rounded-r-lg bg-navy text-white hover:bg-navy-700" aria-label="Buscar CEP">
            {buscandoCep ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}</button>}>
          <input id="cep" name="cep" inputMode="numeric" value={d.cep} onChange={(e) => set("cep", mascaraCep(e.target.value))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); buscarCep(); } }} placeholder="00000-000" />
        </Campo>
        <Campo id="logradouroNumero" rotulo="Endereço" Icone={Home}>
          <input id="logradouroNumero" name="logradouroNumero" value={d.logradouroNumero} onChange={(e) => set("logradouroNumero", e.target.value)} placeholder="Rua Exemplo, Nº 123" />
        </Campo>
        <Campo id="complemento" rotulo="Complemento" Icone={Puzzle}>
          <input id="complemento" name="complemento" value={d.complemento} onChange={(e) => set("complemento", e.target.value)} placeholder="Apto, sala, etc." />
        </Campo>
        <Campo id="empresaOrigem" rotulo="Empresa de Origem" Icone={Building2}>
          <input id="empresaOrigem" name="empresaOrigem" value={d.empresaOrigem} onChange={(e) => set("empresaOrigem", e.target.value)} placeholder="Digite a empresa..." />
        </Campo>
        <Campo id="visitadoId" rotulo="Pessoa ou Setor a ser Visitado" obrig erro={erros.visitadoId} Icone={Users}>
          <select id="visitadoId" value={valorVisitado} onChange={(e) => {
            const [t, id] = e.target.value.split(":");
            setD((x) => ({ ...x, visitadoTipo: t === "F" ? "FUNCIONARIO" : "SETOR", visitadoId: id ?? "" }));
            setErrosCliente((er) => ({ ...er, visitadoId: undefined }));
          }}>
            <option value="">Digite o nome ou setor...</option>
            <optgroup label="Setores">{setores.map((s) => <option key={s.id} value={`S:${s.id}`}>{s.nome}</option>)}</optgroup>
            <optgroup label="Pessoas">{funcionarios.map((f) => <option key={f.id} value={`F:${f.id}`}>{f.nome}</option>)}</optgroup>
          </select>
          <input type="hidden" name="visitadoTipo" value={d.visitadoTipo} />
          <input type="hidden" name="visitadoId" value={d.visitadoId} />
        </Campo>
      </div>

      <div className="mt-5 grid gap-x-7 gap-y-5 md:grid-cols-[1.15fr_1fr]">
        <Campo id="motivoId" rotulo="Motivo da Visita" obrig erro={erros.motivoId} Icone={AlignLeft}>
          <select id="motivoId" name="motivoId" value={d.motivoId} onChange={(e) => set("motivoId", e.target.value)}>
            <option value="">Selecione o motivo da visita...</option>
            {motivos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </Campo>
        <Campo id="placa" rotulo={<>Placa do Veículo <span className="font-normal">(opcional)</span></>} erro={erros.placa} Icone={Car}>
          <input id="placa" name="placa" value={d.placa} onChange={(e) => set("placa", e.target.value.toUpperCase().slice(0, 8))} placeholder="ABC-1234" />
        </Campo>
      </div>

      <div className="mt-7 flex items-center gap-4 rounded-xl bg-navy-50 px-5 py-4">
        <Info className="h-7 w-7 shrink-0 rounded-full bg-navy p-1 text-white" />
        <div className="h-8 w-px bg-navy/40" />
        <p className="flex-1 text-[15px] text-tinta">Os dados informados serão utilizados apenas para controle de acesso, conforme a LGPD.</p>
        <div className="hidden items-center gap-2 text-navy sm:flex"><ShieldCheck className="h-8 w-8" /><div className="leading-tight"><b>LGPD</b><div className="text-[10px]">Dados protegidos</div></div></div>
      </div>

      {estado && !estado.ok && estado.mensagem && <p className="msg-erro mt-4 text-center" role="alert">{estado.mensagem}</p>}

      <div className="mt-7 flex flex-wrap justify-center gap-5">
        <BotaoSalvar />
        <button type="button" onClick={limpar} className="btn-contorno h-12 px-8 text-base"><Eraser className="h-5 w-5" /> Limpar Formulário</button>
        <button type="button" onClick={() => router.push("/visitantes")} className="btn-neutro h-12 px-8 text-base"><X className="h-5 w-5" /> Cancelar</button>
      </div>
    </form>
  );
}
