"use client";
import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, LogIn, LogOut, Search, XCircle } from "lucide-react";
import { buscarPessoas, registrarManual, type PessoaBusca, type ResultadoTela } from "@/app/(app)/portaria/acoes";
import { Selo } from "./Selo";

/** Contingência: o porteiro identifica a pessoa por documento e registra entrada/saída. */
export function RegistroManual() {
  const [q, setQ] = useState("");
  const [lista, setLista] = useState<PessoaBusca[]>([]);
  const [sel, setSel] = useState<PessoaBusca | null>(null);
  const [obs, setObs] = useState("");
  const [res, setRes] = useState<ResultadoTela | null>(null);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    const t = setTimeout(async () => setLista(q.trim().length >= 2 ? await buscarPessoas(q) : []), 250);
    return () => clearTimeout(t);
  }, [q]);

  function registrar(sentido: "ENTRADA" | "SAIDA") {
    if (!sel) return;
    iniciar(async () => {
      setRes(await registrarManual(sel.id, sentido, obs || undefined));
      setSel(null); setQ(""); setObs("");
    });
  }

  return (
    <section className="cartao p-6">
      <h2 className="text-lg font-bold">Registro manual</h2>
      <p className="mb-4 text-sm text-suave">Use quando o reconhecimento falhar. A pessoa passa pelas mesmas regras de autorização.</p>
      <div className="campo"><Search /><input value={q} onChange={(e) => { setQ(e.target.value); setSel(null); setRes(null); }} placeholder="Nome ou CPF da pessoa (confira o documento)..." /></div>
      {!sel && lista.length > 0 && (
        <ul className="mt-2 divide-y divide-borda rounded-lg border border-borda">
          {lista.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setSel(p)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-navy-50">
                <span className="flex-1 font-semibold">{p.nome}</span>
                <span className="text-xs text-suave">{p.tipo === "FUNCIONARIO" ? "Funcionário" : "Visitante"}</span>
                <Selo valor={p.situacao} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {sel && (
        <div className="mt-4 space-y-3 rounded-xl bg-navy-50 p-4">
          <p className="font-semibold text-navy">{sel.nome}</p>
          <div className="campo bg-white"><input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observação (ex.: rosto não reconhecido, documento conferido)" /></div>
          <div className="flex gap-3">
            <button className="btn-primario" disabled={pendente} onClick={() => registrar("ENTRADA")}><LogIn className="h-4 w-4" /> Registrar entrada</button>
            <button className="btn-contorno" disabled={pendente} onClick={() => registrar("SAIDA")}><LogOut className="h-4 w-4" /> Registrar saída</button>
          </div>
        </div>
      )}
      {res && (
        <div className={`mt-4 flex items-center gap-3 rounded-xl p-4 ${res.permitido ? "bg-green-50 text-sac-verde" : "bg-red-50 text-sac-vermelho"}`} role="status">
          {res.permitido ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
          <div><p className="font-bold">{res.mensagem}</p>{!res.permitido && <p className="text-sm">Entrada não liberada. Verifique a autorização na ficha da pessoa.</p>}</div>
        </div>
      )}
    </section>
  );
}
