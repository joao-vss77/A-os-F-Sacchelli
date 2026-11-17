// Aplica migrations + seed num Postgres em memória (PGlite) com stubs do Supabase.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
const db = new PGlite();
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.uid', true), '')::uuid $$;
  create role authenticated; create role anon;
`);
const dir = new URL("../supabase/migrations/", import.meta.url);
for (const f of readdirSync(dir).sort()) { await db.exec(readFileSync(new URL(f, dir), "utf8")); console.log("ok", f); }
await db.exec(readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf8"));
const r = await db.query("select (select count(*) from pessoa) pessoas, (select count(*) from autorizacao_acesso) auts, (select count(*) from log_auditoria) logs");
console.log("seed", r.rows[0]);
// regra visitado e registro_motivo
for (const [nome, sql] of [
  ["registro liberado com motivo", "insert into registro_acesso (tipo_movimento, origem, resultado, motivo_negativa) values ('ENTRADA','SIMULADOR','LIBERADO','SEM_AUTORIZACAO')"],
  ["cpf inválido", "insert into pessoa (tipo_pessoa, nome_completo, cpf) values ('VISITANTE','X','123')"],
]) { try { await db.exec(sql); console.log("FALHOU (deveria rejeitar):", nome); process.exit(1); } catch { console.log("rejeitado ok:", nome); } }
await db.exec(`insert into registro_acesso (pessoa_id, tipo_movimento, origem, resultado, data_hora) select id,'ENTRADA','SIMULADOR','LIBERADO', now() - interval '1 hour' from pessoa limit 2;
  insert into registro_acesso (pessoa_id, tipo_movimento, origem, resultado) select id,'SAIDA','SIMULADOR','LIBERADO' from pessoa order by nome_completo limit 1;`);
console.log("presentes", (await db.query("select count(*)::int n from vw_presentes")).rows[0].n, "(esperado 1)");
console.log("horas", (await db.query("select count(*)::int n from vw_eventos_hora")).rows[0].n);
console.log("migrations ok");
