"use client";
import { useState, useTransition } from "react";
import { Fingerprint, ScanFace, Send } from "lucide-react";
import { solicitarBiometria } from "@/app/(app)/visitantes/actions";
import { BASES_LEGAIS } from "@/lib/biometria-constantes";
import { CapturaFace } from "./CapturaFace";

export interface DispositivoOpcao { id: string; nome: string; modo_integracao: string }

export function PainelBiometria({ pessoaId, dispositivos }: { pessoaId: string; dispositivos: DispositivoOpcao[] }) {
  const [aba, setAba] = useState<"FACIAL" | "DIGITAL">("FACIAL");
  const [foto, setFoto] = useState<string | null>(null);
  const [dispositivoId, setDispositivoId] = useState(dispositivos[0]?.id ?? "");
  const [baseLegal, setBaseLegal] = useState<string>(BASES_LEGAIS[0]);
  const [aceite, setAceite] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; mensagem: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  const exigeAceite = baseLegal.startsWith("Consentimento");
  const podeEnviar = dispositivoId && (!exigeAceite || aceite) && (aba === "DIGITAL" || foto);

  function enviar() {
    iniciar(async () => {
      setResultado(await solicitarBiometria({ pessoaId, tipo: aba, dispositivoId, baseLegal, fotoBase64: aba === "FACIAL" ? foto ?? undefined : undefined }));
    });
  }

  return (
    <div className="cartao p-6">
      <h2 className="text-xl font-bold">Biometria para acesso</h2>
      <p className="mb-4 text-sm text-suave">Cadastre a face e/ou a digital para liberar a entrada pelo equipamento.</p>
      <div className="mb-5 inline-flex rounded-lg border border-borda p-1">
        {(["FACIAL", "DIGITAL"] as const).map((t) => (
          <button key={t} type="button" onClick={() => { setAba(t); setResultado(null); }}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold ${aba === t ? "bg-navy text-white" : "text-navy"}`}>
            {t === "FACIAL" ? <ScanFace className="h-4 w-4" /> : <Fingerprint className="h-4 w-4" />}
            {t === "FACIAL" ? "Reconhecimento facial" : "Digital"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          {aba === "FACIAL" ? (
            <CapturaFace onCapturar={setFoto} />
          ) : (
            <div className="flex aspect-[4/3] max-w-sm flex-col items-center justify-center rounded-xl bg-navy-50 p-6 text-center">
              <Fingerprint className="h-16 w-16 text-navy-600" strokeWidth={1.3} />
              <p className="mt-3 font-semibold text-navy">A digital é lida no próprio equipamento</p>
              <p className="mt-1 text-sm text-suave">Ao enviar, o equipamento entra em modo de captura. Peça para o visitante posicionar o dedo no leitor.</p>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <label className="rotulo obrig">Equipamento</label>
            <div className="campo"><select value={dispositivoId} onChange={(e) => setDispositivoId(e.target.value)}>
              {dispositivos.map((d) => <option key={d.id} value={d.id}>{d.nome}{d.modo_integracao === "SIMULADOR" ? " (virtual)" : ""}</option>)}
            </select></div>
          </div>
          <div>
            <label className="rotulo obrig">Base legal (LGPD)</label>
            <div className="campo"><select value={baseLegal} onChange={(e) => setBaseLegal(e.target.value)}>
              {BASES_LEGAIS.map((b) => <option key={b}>{b}</option>)}
            </select></div>
          </div>
          {exigeAceite && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-navy" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
              O titular foi informado e consentiu com o uso da biometria apenas para controle de acesso.
            </label>
          )}
          <button type="button" onClick={enviar} disabled={!podeEnviar || pendente} className="btn-primario">
            <Send className="h-4 w-4" /> {pendente ? "Enviando…" : aba === "FACIAL" ? "Enviar face ao equipamento" : "Iniciar captura da digital"}
          </button>
          {resultado && (
            <p className={`rounded-lg px-3 py-2 text-sm ${resultado.ok ? "bg-green-50 text-sac-verde" : "bg-red-50 text-sac-vermelho"}`} role="status">
              {resultado.mensagem}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
