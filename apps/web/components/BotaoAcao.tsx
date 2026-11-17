"use client";
import { useState, useTransition } from "react";

/** Botão que executa uma server action, com confirmação opcional e retorno em texto. */
export function BotaoAcao({ acao, rotulo, classe = "btn-neutro h-9 px-3 text-sm", confirmar, pedirTexto }: {
  acao: (texto?: string) => Promise<unknown>;
  rotulo: React.ReactNode;
  classe?: string;
  confirmar?: string;
  pedirTexto?: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        className={classe}
        disabled={pendente}
        onClick={() => {
          let texto: string | undefined;
          if (pedirTexto) {
            const t = window.prompt(pedirTexto);
            if (t === null) return;
            texto = t;
          } else if (confirmar && !window.confirm(confirmar)) return;
          iniciar(async () => {
            const r = await acao(texto);
            setMsg(r && typeof r === "object" && "mensagem" in r ? String((r as { mensagem: unknown }).mensagem) : "");
          });
        }}
      >
        {pendente ? "Aguarde…" : rotulo}
      </button>
      {msg && <span className="mt-1 text-xs text-suave">{msg}</span>}
    </span>
  );
}
