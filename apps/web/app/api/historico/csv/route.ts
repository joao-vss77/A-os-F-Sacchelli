import { NextResponse } from "next/server";
import { formatarDataHora, ROTULO_MOTIVO, type MotivoNegativa } from "@portaria/core";
import { usuarioAtual } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";
import { consultaHistorico, filtrarPorNome, type LinhaHistorico } from "@/lib/historico";

export const dynamic = "force-dynamic";

const csv = (v: unknown) => {
  const s = String(v ?? "");
  // aspas + neutraliza fórmulas (=, +, -, @) ao abrir no Excel
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  if (!(await usuarioAtual())) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  const p = Object.fromEntries(new URL(req.url).searchParams);
  const { data } = await consultaHistorico(supabaseServidor(), p, 10000);
  const linhas = filtrarPorNome((data ?? []) as unknown as LinhaHistorico[], p.q);
  const cab = ["Data/hora", "Pessoa", "Tipo de pessoa", "Movimento", "Resultado", "Motivo", "Origem", "Equipamento", "Registrado por", "Observação"];
  const corpo = linhas.map((l) => [
    formatarDataHora(l.data_hora), l.pessoa?.nome_completo ?? "Não identificada", l.pessoa?.tipo_pessoa ?? "", l.tipo_movimento, l.resultado,
    l.motivo_negativa ? ROTULO_MOTIVO[l.motivo_negativa as MotivoNegativa] : "", l.origem, l.dispositivo?.nome ?? "", l.usuario?.nome ?? "", l.observacao ?? "",
  ].map(csv).join(";"));
  const texto = "﻿" + [cab.map(csv).join(";"), ...corpo].join("\r\n");
  return new NextResponse(texto, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="historico-acessos.csv"` },
  });
}
