import type { LucideIcon } from "lucide-react";
import { Logo } from "./Logo";

/** Cabeçalho das páginas no padrão da interface de referência (logo | título | ícone). */
export function Cabecalho({ titulo, subtitulo, Icone, acoes }: { titulo: string; subtitulo: string; Icone?: LucideIcon; acoes?: React.ReactNode }) {
  return (
    <header className="relative flex items-center gap-6 overflow-hidden border-b border-borda bg-gradient-to-r from-white via-white to-navy-50 px-8 py-5">
      <div className="hidden md:block"><Logo /></div>
      <div className="hidden h-14 w-px bg-navy/70 md:block" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[26px] font-bold leading-tight">{titulo}</h1>
        <p className="text-suave">{subtitulo}</p>
      </div>
      {acoes}
      {Icone && <Icone className="hidden h-12 w-12 text-navy-600/70 lg:block" strokeWidth={1.4} />}
      <div className="pointer-events-none absolute -right-6 top-0 hidden h-full w-28 skew-x-[-24deg] bg-navy/90 xl:block" />
    </header>
  );
}
