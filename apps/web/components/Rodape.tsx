"use client";
import { useEffect, useState } from "react";
import { Clock, Monitor } from "lucide-react";

export function Rodape() {
  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => {
    setAgora(new Date());
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const fmt = (o: Intl.DateTimeFormatOptions) => (agora ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", ...o }).format(agora) : "—");
  return (
    <footer className="flex items-center justify-between border-t border-borda bg-white/80 px-6 py-3 text-sm text-suave">
      <div className="flex items-center gap-3">
        <Clock className="h-4 w-4" />
        <span>Data: {fmt({ dateStyle: "short" })}</span>
        <span className="text-borda">|</span>
        <span>Horário: {fmt({ timeStyle: "short" })}</span>
      </div>
      <div className="flex items-center gap-2"><Monitor className="h-4 w-4" /> Portaria - Sacchelli</div>
    </footer>
  );
}
