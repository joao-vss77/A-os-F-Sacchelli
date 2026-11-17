-- Funções, visões e auditoria

create or replace function fn_perfil_atual() returns text
language sql stable security definer set search_path = public as $$
  select p.nome from usuario u join perfil p on p.id = u.perfil_id
  where u.id = auth.uid() and u.ativo
$$;

create or replace function fn_tem_perfil(perfis text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(fn_perfil_atual() = any(perfis), false)
$$;

-- atualizado_em
create or replace function fn_tocar_atualizado() returns trigger language plpgsql as $$
begin new.atualizado_em := now(); return new; end $$;
create trigger pessoa_atualizado before update on pessoa for each row execute function fn_tocar_atualizado();

-- Auditoria genérica
create or replace function fn_auditar() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_id text;
begin
  v_id := coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id', to_jsonb(new)->>'pessoa_id', to_jsonb(old)->>'pessoa_id');
  insert into log_auditoria (usuario_id, acao, entidade, entidade_id, detalhe)
  values (
    (select id from usuario where id = auth.uid()),
    tg_op, tg_table_name, v_id,
    case tg_op when 'DELETE' then to_jsonb(old) - 'payload' else to_jsonb(new) - 'payload' end
  );
  return coalesce(new, old);
end $$;

create trigger aud_pessoa after insert or update or delete on pessoa for each row execute function fn_auditar();
create trigger aud_visita after insert or update or delete on visita for each row execute function fn_auditar();
create trigger aud_autorizacao after insert or update or delete on autorizacao_acesso for each row execute function fn_auditar();
create trigger aud_usuario after insert or update or delete on usuario for each row execute function fn_auditar();
create trigger aud_dispositivo after insert or update or delete on dispositivo for each row execute function fn_auditar();
create trigger aud_biometria after insert or update or delete on identificacao_biometrica for each row execute function fn_auditar();

-- Pessoas presentes agora: último movimento LIBERADO de cada pessoa é ENTRADA
create or replace view vw_presentes with (security_invoker = true) as
select x.pessoa_id, x.nome_completo, x.tipo_pessoa, x.data_hora as entrada_em, x.dispositivo_id
from (
  select distinct on (r.pessoa_id) r.pessoa_id, p.nome_completo, p.tipo_pessoa, r.data_hora, r.dispositivo_id, r.tipo_movimento
  from registro_acesso r join pessoa p on p.id = r.pessoa_id
  where r.resultado = 'LIBERADO'
  order by r.pessoa_id, r.data_hora desc
) x
where x.tipo_movimento = 'ENTRADA';

-- Eventos por hora (fuso de São Paulo), últimas 24 h
create or replace view vw_eventos_hora with (security_invoker = true) as
select date_trunc('hour', data_hora at time zone 'America/Sao_Paulo') as hora,
       count(*) filter (where resultado = 'LIBERADO') as liberados,
       count(*) filter (where resultado = 'NEGADO') as negados,
       count(*) filter (where resultado = 'FALHA_TECNICA') as falhas
from registro_acesso
where data_hora >= now() - interval '24 hours'
group by 1
order by 1;
