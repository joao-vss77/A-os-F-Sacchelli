"use client";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface PontoHora { hora: string; liberados: number; negados: number; falhas: number }

/** Passagens por hora nas últimas 24 h (verde liberado, vermelho negado, amarelo falha). */
export function GraficoEventos({ dados }: { dados: PontoHora[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={dados} margin={{ top: 10, right: 10, left: -18, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3E9F2" />
        <XAxis dataKey="hora" tick={{ fontSize: 12, fill: "#5A6577" }} tickLine={false} axisLine={{ stroke: "#D5DEEB" }} interval={1} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#5A6577" }} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: "#EEF3FB" }} contentStyle={{ borderRadius: 10, borderColor: "#D5DEEB" }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="liberados" name="Liberados" fill="#1F9D55" radius={[4, 4, 0, 0]} />
        <Bar dataKey="negados" name="Negados" fill="#C62828" radius={[4, 4, 0, 0]} />
        <Bar dataKey="falhas" name="Falhas" fill="#F2C200" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
