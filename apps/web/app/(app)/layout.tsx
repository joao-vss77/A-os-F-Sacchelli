import { Sidebar } from "@/components/Sidebar";
import { Rodape } from "@/components/Rodape";
import { exigirUsuario } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await exigirUsuario();
  return (
    <div className="flex min-h-screen">
      <Sidebar perfil={u.perfil} nome={u.nome} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1">{children}</main>
        <Rodape />
      </div>
    </div>
  );
}
