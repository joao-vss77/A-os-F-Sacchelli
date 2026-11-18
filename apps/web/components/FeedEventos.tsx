"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, Hand, Radio, ScanFace, Cpu } from "lucide-react";
import { formatarDataHora, ROTULO_MOTIVO, type MotivoNegativa } from "@portaria/core";
import { supabaseNavegador } from "@/lib/supabase/client";
import { Selo } from "./Selo";
import { SELECT_FEED, type EventoFeed } from "@/lib/feed";

export type { EventoFeed };


const ICONE: Record<string, typeof ScanFace> = { RECONHECIMENTO_FACIAL: ScanFace, BIOMETRIA_DIGITAL: Fingerprint, MANUAL_PORTEIRO: Hand, SIMULADOR: Cpu };

/** Lista de passagens em tempo real (Supabase Realtime). `soAlertas` mostra só negados/falhas. */
export function FeedEventos({ iniciais, soAlertas = false, titulo }: { iniciais: EventoFeed[]; soAlertas?: boolean; titulo: string }) {
  const [eventos, setEventos] = useState(iniciais);
  const [aoVivo, setAoVivo] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const sb = supabaseNavegador();
    const canal = sb
      .channel(`feed-${soAlertas ? "alertas" : "todos"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "registro_acesso" }, async (msg) => {
        const { data } = await sb.from("registro_acesso").select(SELECT_FEED).eq("id", (msg.new as { id: string }).id).single();
        if (!data) return;
        const ev = data as unknown as EventoFeed;
        if (soAlertas && ev.resultado === "LIBERADO") return;
        setEventos((x) => [ev, ...x].slice(0, 30));
        router.refresh(); // atualiza indicadores e gráfico do servidor
      })
      .subscribe((s) => setAoVivo(s === "SUBSCRIBED"));
    return () => { sb.removeChannel(canal); };
  }, [soAlertas, router]);

  return (
    <section className="cartao flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-borda px-5 py-3.5">
        <h2 className="text-lg font-bold">{titulo}</h2>
        <span className={`flex items-center gap-1.5 text-xs font-semibold ${aoVivo ? "text-sac-verde" : "text-suave"}`}>
          <Radio className="h-3.5 w-3.5" /> {aoVivo ? "ao vivo" : "conectando…"}
        </span>
      </div>
      <ul className="flex-1 divide-y divide-borda/70 overflow-y-auto">
        {eventos.map((e) => {
          const Icone = ICONE[e.origem] ?? ScanFace;
          return (
            <li key={e.id} className="flex items-start gap-3 px-5 py-3">
              <Icone className={`mt-0.5 h-5 w-5 shrink-0 ${e.resultado === "LIBERADO" ? "text-sac-verde" : e.resultado === "NEGADO" ? "text-sac-vermelho" : "text-amber-600"}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{e.pessoa?.nome_completo ?? "Pessoa não identificada"}</p>
                <p className="text-xs text-suave">{formatarDataHora(e.data_hora)} · {e.dispositivo?.nome ?? "Registro manual"}</p>
                {e.motivo_negativa && <p className="text-xs text-sac-vermelho">{ROTULO_MOTIVO[e.motivo_negativa as MotivoNegativa]}</p>}
              </div>
              <div className="flex flex-col items-end gap-1"><Selo valor={e.resultado} /><Selo valor={e.tipo_movimento} /></div>
            </li>
          );
        })}
        {!eventos.length && <li className="px-5 py-10 text-center text-suave">{soAlertas ? "Nenhum alerta recente." : "Nenhuma passagem registrada."}</li>}
      </ul>
    </section>
  );
}
