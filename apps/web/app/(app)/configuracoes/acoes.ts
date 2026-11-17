"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cpfValido, normalizarCpf } from "@portaria/core";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin, supabaseServidor } from "@/lib/supabase/server";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
function voltar(aba: string, msg: string, erro = false): never {
  revalidatePath("/configuracoes");
  redirect(`/configuracoes?aba=${aba}&${erro ? "erro" : "ok"}=${encodeURIComponent(msg)}`);
}

export async function criarUsuario(f: FormData) {
  await exigirUsuario(["ADMIN"]);
  const nome = s(f, "nome"), email = s(f, "email").toLowerCase(), senha = s(f, "senha"), perfil = s(f, "perfil");
  if (!nome || !email || senha.length < 8) voltar("usuarios", "Preencha nome, e-mail e senha com 8+ caracteres.", true);
  const adm = supabaseAdmin();
  const { data: per } = await adm.from("perfil").select("id").eq("nome", perfil).single();
  if (!per) voltar("usuarios", "Perfil inválido.", true);
  const { data, error } = await adm.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome } });
  if (error || !data.user) voltar("usuarios", error?.message ?? "Falha ao criar usuário.", true);
  const { error: e2 } = await adm.from("usuario").insert({ id: data.user!.id, perfil_id: per!.id, nome, login: email });
  if (e2) voltar("usuarios", e2.message, true);
  voltar("usuarios", `Usuário ${email} criado.`);
}

export async function alternarUsuario(id: string, ativo: boolean) {
  const u = await exigirUsuario(["ADMIN"]);
  if (id === u.id) return;
  await supabaseServidor().from("usuario").update({ ativo }).eq("id", id);
  revalidatePath("/configuracoes");
}

export async function criarSetor(f: FormData) {
  await exigirUsuario(["ADMIN"]);
  const { error } = await supabaseServidor().from("setor").insert({ nome: s(f, "nome") });
  voltar("setores", error ? error.message : "Setor criado.", !!error);
}

export async function criarMotivo(f: FormData) {
  await exigirUsuario(["ADMIN"]);
  const { error } = await supabaseServidor().from("motivo_visita").insert({ descricao: s(f, "descricao") });
  voltar("motivos", error ? error.message : "Motivo criado.", !!error);
}

export async function alternarCadastro(tabela: "setor" | "motivo_visita", id: string, ativo: boolean) {
  await exigirUsuario(["ADMIN"]);
  await supabaseServidor().from(tabela).update({ ativo }).eq("id", id);
  revalidatePath("/configuracoes");
}

export async function criarFuncionario(f: FormData) {
  await exigirUsuario(["ADMIN"]);
  const nome = s(f, "nome"), cpf = normalizarCpf(s(f, "cpf")), matricula = s(f, "matricula"), setorId = s(f, "setorId");
  if (!nome || !matricula || !setorId) voltar("funcionarios", "Preencha nome, matrícula e setor.", true);
  if (!cpfValido(cpf)) voltar("funcionarios", "CPF inválido.", true);
  const sb = supabaseServidor();
  const { data: p, error } = await sb.from("pessoa").insert({ tipo_pessoa: "FUNCIONARIO", nome_completo: nome, cpf, email: s(f, "email") || null }).select("id").single();
  if (error || !p) voltar("funcionarios", error?.message.includes("duplicate") ? "CPF já cadastrado." : error?.message ?? "Erro", true);
  const { error: e2 } = await sb.from("funcionario").insert({ pessoa_id: p!.id, matricula, setor_id: setorId });
  if (e2) {
    await sb.from("pessoa").delete().eq("id", p!.id);
    voltar("funcionarios", e2.message.includes("duplicate") ? "Matrícula já cadastrada." : e2.message, true);
  }
  // Funcionário: autorização permanente (sem término)
  await sb.from("autorizacao_acesso").insert({ pessoa_id: p!.id, valido_de: new Date().toISOString(), valido_ate: null });
  voltar("funcionarios", `${nome} cadastrado com acesso permanente. Cadastre a biometria na ficha.`);
}

export async function salvarDispositivo(f: FormData) {
  await exigirUsuario(["ADMIN"]);
  const dados = {
    nome: s(f, "nome"), identificador_externo: s(f, "identificador"), sentido: s(f, "sentido"), modo_integracao: s(f, "modo"),
    endereco_rede: s(f, "endereco") || null, localizacao: s(f, "localizacao") || null,
  };
  if (!dados.nome || !/^[\w-]{3,40}$/.test(dados.identificador_externo)) voltar("dispositivos", "Informe nome e um identificador (letras, números e hífen).", true);
  const id = s(f, "id");
  const sb = supabaseServidor();
  const { error } = id ? await sb.from("dispositivo").update(dados).eq("id", id) : await sb.from("dispositivo").insert(dados);
  voltar("dispositivos", error ? error.message : "Dispositivo salvo.", !!error);
}

export async function abrirPortaRemota(dispositivoId: string) {
  await exigirUsuario(["GESTOR", "ADMIN"]);
  await supabaseServidor().from("comando_dispositivo").insert({ dispositivo_id: dispositivoId, tipo: "ABRIR_PORTA", payload: {} });
  return { ok: true, mensagem: "Comando enviado ao agente." };
}
