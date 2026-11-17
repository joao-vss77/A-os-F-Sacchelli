"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { supabaseNavegador } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(params.get("erro") === "sem-acesso" ? "Usuário sem acesso ao sistema. Fale com o administrador." : "");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro("");
    const sb = supabaseNavegador();
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha });
    setCarregando(false);
    if (error) return setErro("E-mail ou senha inválidos.");
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-navy p-12 text-white lg:flex">
        <Logo claro />
        <div className="relative z-10 max-w-md">
          <h1 className="font-marca text-4xl font-bold leading-tight text-white">Portaria inteligente</h1>
          <p className="mt-4 text-lg text-navy-100">
            Cadastro de visitantes, reconhecimento facial e digital, e registro seguro de cada entrada e saída.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-sm text-navy-100">
          <ShieldCheck className="h-4 w-4" /> Dados tratados conforme a LGPD
        </div>
        <div className="pointer-events-none absolute -right-24 bottom-[-6rem] flex gap-6 opacity-20">
          <div className="h-80 w-40 skew-x-[-24deg] bg-sac-amarelo" />
          <div className="h-80 w-40 skew-x-[-24deg] bg-sac-verde" />
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={entrar} className="cartao w-full max-w-md p-8">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="text-2xl font-bold">Entrar</h2>
          <p className="mb-6 mt-1 text-suave">Acesse com seu usuário da portaria.</p>

          <label className="rotulo" htmlFor="email">E-mail</label>
          <div className="campo mb-4">
            <Mail />
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu.nome@sacchelli.com.br" />
          </div>
          <label className="rotulo" htmlFor="senha">Senha</label>
          <div className="campo mb-2">
            <Lock />
            <input id="senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          {erro && <p className="msg-erro" role="alert">{erro}</p>}
          <button className="btn-primario mt-6 w-full" disabled={carregando}>{carregando ? "Entrando…" : "Entrar"}</button>
        </form>
      </section>
    </main>
  );
}
