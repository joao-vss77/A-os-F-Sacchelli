-- Row Level Security. O servidor (Next.js) usa a service role apenas nas rotas do agente
-- e na criação de usuários; as telas usam a sessão do usuário e passam por estas políticas.

do $$
declare t text;
begin
  foreach t in array array['perfil','permissao','perfil_permissao','usuario','pessoa','setor','visitante','funcionario',
    'motivo_visita','visita','autorizacao_acesso','dispositivo','identificacao_biometrica','registro_acesso',
    'evento_dispositivo','comando_dispositivo','log_auditoria']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select to authenticated using (fn_perfil_atual() is not null)', t || '_leitura', t);
  end loop;
end $$;

-- Configurações: só ADMIN escreve
do $$
declare t text;
begin
  foreach t in array array['perfil','permissao','perfil_permissao','usuario','setor','motivo_visita','dispositivo','funcionario']
  loop
    execute format('create policy %I on %I for all to authenticated using (fn_tem_perfil(array[''ADMIN''])) with check (fn_tem_perfil(array[''ADMIN'']))', t || '_admin', t);
  end loop;
end $$;

-- Operação: porteiro, gestor e admin
do $$
declare t text;
begin
  foreach t in array array['pessoa','visitante','visita','autorizacao_acesso','identificacao_biometrica','comando_dispositivo']
  loop
    execute format('create policy %I on %I for insert to authenticated with check (fn_tem_perfil(array[''PORTEIRO'',''GESTOR'',''ADMIN'']))', t || '_ins', t);
    execute format('create policy %I on %I for update to authenticated using (fn_tem_perfil(array[''PORTEIRO'',''GESTOR'',''ADMIN''])) with check (fn_tem_perfil(array[''PORTEIRO'',''GESTOR'',''ADMIN'']))', t || '_upd', t);
  end loop;
end $$;

-- Funcionários também podem ser cadastrados (pessoa) por ADMIN: coberto acima.
-- Registros de acesso: só inclusão (sem UPDATE/DELETE para ninguém via API).
create policy registro_acesso_ins on registro_acesso for insert to authenticated
  with check (fn_tem_perfil(array['PORTEIRO','GESTOR','ADMIN']));

-- Exclusão de pessoa: só ADMIN (atendimento a titular LGPD)
create policy pessoa_del on pessoa for delete to authenticated using (fn_tem_perfil(array['ADMIN']));

-- Realtime do painel
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table registro_acesso, dispositivo, comando_dispositivo;
  end if;
end $$;
