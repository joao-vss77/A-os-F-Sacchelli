import { redirect } from "next/navigation";
import type { Perfil } from "@portaria/core";
import { supabaseServidor } from "./supabase/server";

export interface UsuarioAtual {
  id: string;
  nome: string;
  login: string;
  perfil: Perfil;
}

export async function usuarioAtual(): Promise<UsuarioAtual | null> {
  const sb = supabaseServidor();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  const { data: u } = await sb.from("usuario").select("id, nome, login, ativo, perfil:perfil_id(nome)").eq("id", data.user.id).maybeSingle();
  if (!u || !u.ativo) return null;
  const perfil = (u.perfil as unknown as { nome: Perfil } | null)?.nome;
  if (!perfil) return null;
  return { id: u.id, nome: u.nome, login: u.login, perfil };
}

/** Garante usuário logado (e opcionalmente com um dos perfis). */
export async function exigirUsuario(perfis?: Perfil[]): Promise<UsuarioAtual> {
  const u = await usuarioAtual();
  if (!u) redirect("/login?erro=sem-acesso");
  if (perfis && !perfis.includes(u.perfil)) redirect("/?erro=permissao");
  return u;
}
