"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Cpu, DoorOpen, History, Home, LogOut, Settings, Users } from "lucide-react";
import type { Perfil } from "@portaria/core";
import { supabaseNavegador } from "@/lib/supabase/client";
import { Logo } from "./Logo";

const ITENS: { href: string; rotulo: string; Icone: typeof Home; perfis?: Perfil[] }[] = [
  { href: "/", rotulo: "Início", Icone: Home },
  { href: "/portaria", rotulo: "Portaria", Icone: DoorOpen },
  { href: "/visitantes", rotulo: "Visitantes", Icone: Users },
  { href: "/historico", rotulo: "Histórico", Icone: History },
  { href: "/relatorios", rotulo: "Relatórios", Icone: BarChart3, perfis: ["GESTOR", "ADMIN"] },
  { href: "/configuracoes", rotulo: "Configurações", Icone: Settings, perfis: ["ADMIN"] },
  { href: "/simulador", rotulo: "Simulador", Icone: Cpu, perfis: ["GESTOR", "ADMIN"] },
];

export function Sidebar({ perfil, nome }: { perfil: Perfil; nome: string }) {
  const caminho = usePathname();
  const router = useRouter();
  const ativo = (href: string) => (href === "/" ? caminho === "/" : caminho.startsWith(href));

  async function sair() {
    await supabaseNavegador().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[104px] shrink-0 flex-col bg-navy-900 text-white">
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pt-3">
        {ITENS.filter((i) => !i.perfis || i.perfis.includes(perfil)).map(({ href, rotulo, Icone }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1.5 rounded-xl px-1 py-3 text-[12.5px] font-medium transition ${
              ativo(href) ? "bg-navy-600 text-white" : "text-navy-100 hover:bg-white/10"
            }`}
          >
            <Icone className="h-6 w-6" />
            {rotulo}
          </Link>
        ))}
        <button onClick={sair} className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-3 text-[12.5px] font-medium text-navy-100 hover:bg-white/10">
          <LogOut className="h-6 w-6" />
          Sair
        </button>
      </nav>
      <div className="mx-3 border-t border-white/15 py-4 text-center">
        <div className="mx-auto w-fit scale-[.62]"><Logo claro compacto /></div>
        <p className="mt-1 truncate text-[11px] text-navy-100" title={nome}>{nome}</p>
        <p className="text-[10px] uppercase tracking-wider text-sac-amarelo">{perfil}</p>
      </div>
    </aside>
  );
}
