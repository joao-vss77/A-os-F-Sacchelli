"use client";
import { useEffect, useState, useTransition } from "react";
import { Fingerprint, ScanFace, Search, UserX } from "lucide-react";
import { buscarPessoas, simularPassagem, type PessoaBusca, type ResultadoTela } from "@/app/(app)/portaria/acoes";

/** Equipamento virtual para demonstração: percorre exatamente o mesmo serviço de decisão do agente. */
export function Simulador({ dispositivos }: { dispositivos: { id: string; nome: string }[] }) {
  const [dispositivoId, setDispositivoId] = useState(dispositivos[0]?.id ?? "");
  const [metodo, setMetodo] = useState<"FACIAL" | "DIGITAL">("FACIAL");
  const [sentido, setSentido] = useState<"AUTO" | "ENTRADA" | "SAIDA">("AUTO");
  const [q, setQ] = useState("");
  const [lista, setLista] = useState<PessoaBusca[]>([]);
  const [pessoa, setPessoa] = useState<PessoaBusca | null>(null);
  const [res, setRes] = useState<ResultadoTela | null>(null);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    const t = setTimeout(async () => setLista(q.trim().length >= 2 ? await buscarPessoas(q) : []), 250);
    return () => clearTimeout(t);
  }, [q]);

  function passar(desconhecido: boolean) {
    setRes(null);
    iniciar(async () => setRes(await simularPassagem({ dispositivoId, pessoaId: desconhecido ? null : pessoa?.id ?? null, metodo, sentido })));
  }

  const tela = res ? (res.permitido ? "bg-sac-verde" : "bg-sac-vermelho") : "bg-navy-900";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <section className="cartao space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <label><span className="rotulo">Equipamento</span><div className="campo"><select value={dispositivoId} onChange={(e) => setDispositivoId(e.target.value)}>
            {dispositivos.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}</select></div></label>
          <label><span className="rotulo">Identificação</span><div className="campo"><select value={metodo} onChange={(e) => setMetodo(e.target.value as "FACIAL")}>
            <option value="FACIAL">Reconhecimento facial</option><option value="DIGITAL">Digital</option></select></div></label>
          <label><span className="rotulo">Sentido</span><div className="campo"><select value={sentido} onChange={(e) => setSentido(e.target.value as "AUTO")}>
            <option value="AUTO">Automático (pelo equipamento)</option><option value="ENTRADA">Entrada</option><option value="SAIDA">Saída</option></select></div></label>
        </div>
        <div>
          <span className="rotulo">Quem está na frente do equipamento?</span>
          <div className="campo"><Search /><input value={q} onChange={(e) => { setQ(e.target.value); setPessoa(null); }} placeholder="Buscar pessoa cadastrada..." /></div>
          {!pessoa && lista.length > 0 && (
            <ul className="mt-2 divide-y divide-borda rounded-lg border border-borda">
              {lista.map((p) => <li key={p.id}><button type="button" onClick={() => { setPessoa(p); setQ(p.nome); }} className="w-full px-4 py-2 text-left hover:bg-navy-50">{p.nome} <span className="text-xs text-suave">· código {p.codigo}</span></button></li>)}
            </ul>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primario" disabled={!pessoa || pendente} onClick={() => passar(false)}>
            {metodo === "FACIAL" ? <ScanFace className="h-5 w-5" /> : <Fingerprint className="h-5 w-5" />} Simular passagem
          </button>
          <button className="btn-neutro" disabled={pendente} onClick={() => passar(true)}><UserX className="h-5 w-5" /> Rosto/digital desconhecido</button>
        </div>
        <p className="text-sm text-suave">
          A simulação usa o mesmo serviço de decisão que o agente chama quando o equipamento real identifica alguém: o registro aparece no painel e no histórico com origem “Simulador”.
        </p>
      </section>

      <section aria-live="polite" className="mx-auto w-full max-w-[380px] rounded-[2rem] bg-slate-800 p-4 shadow-2xl">
        <div className={`flex aspect-[3/4] flex-col items-center justify-center rounded-[1.4rem] p-6 text-center text-white transition-colors ${tela}`}>
          {pendente ? <p className="animate-pulse text-lg">Identificando…</p> : res ? (
            <>
              <p className="font-marca text-3xl font-bold">{res.permitido ? (res.sentido === "SAIDA" ? "ATÉ LOGO" : "BEM-VINDO") : "ACESSO NEGADO"}</p>
              <p className="mt-3 text-lg">{res.mensagem}</p>
            </>
          ) : (
            <>{metodo === "FACIAL" ? <ScanFace className="h-24 w-24 opacity-70" strokeWidth={1} /> : <Fingerprint className="h-24 w-24 opacity-70" strokeWidth={1} />}<p className="mt-4 opacity-80">Aproxime-se do equipamento</p></>
          )}
        </div>
        <p className="mt-3 text-center text-xs tracking-widest text-slate-400">EQUIPAMENTO VIRTUAL</p>
      </section>
    </div>
  );
}
