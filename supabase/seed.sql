-- Dados iniciais (rodar depois das migrations)
insert into perfil (nome) values ('PORTEIRO'), ('GESTOR'), ('ADMIN') on conflict do nothing;

insert into permissao (codigo, descricao) values
  ('VISITANTE_CADASTRAR', 'Cadastrar visitantes e visitas'),
  ('ACESSO_MANUAL', 'Registrar acesso manual'),
  ('HISTORICO_VER', 'Consultar histórico'),
  ('RELATORIO_VER', 'Emitir relatórios'),
  ('AUTORIZACAO_GERIR', 'Revogar autorizações e bloquear pessoas'),
  ('CONFIG_GERIR', 'Gerenciar usuários, dispositivos e cadastros')
on conflict do nothing;

insert into perfil_permissao
select p.id, m.id from perfil p join permissao m on
  (p.nome = 'ADMIN')
  or (p.nome = 'GESTOR' and m.codigo in ('VISITANTE_CADASTRAR','ACESSO_MANUAL','HISTORICO_VER','RELATORIO_VER','AUTORIZACAO_GERIR'))
  or (p.nome = 'PORTEIRO' and m.codigo in ('VISITANTE_CADASTRAR','ACESSO_MANUAL','HISTORICO_VER'))
on conflict do nothing;

insert into setor (nome) values ('Recursos Humanos'), ('Produção'), ('Comercial'), ('Financeiro'), ('Logística'), ('Manutenção'), ('Qualidade'), ('TI')
on conflict do nothing;

insert into motivo_visita (descricao) values ('Reunião'), ('Entrega'), ('Manutenção'), ('Entrevista'), ('Visita técnica'), ('Prestação de serviço'), ('Outros')
on conflict do nothing;

insert into dispositivo (nome, tipo, sentido, modo_integracao, identificador_externo, localizacao, situacao) values
  ('Portaria — Facial/Digital', 'LEITOR_FACIAL', 'BIDIRECIONAL', 'INTELBRAS_BIOT', 'portaria-01', 'Portaria principal', 'INDISPONIVEL'),
  ('Equipamento virtual (simulador)', 'LEITOR_FACIAL', 'BIDIRECIONAL', 'SIMULADOR', 'simulador-01', 'Demonstração', 'ATIVO')
on conflict do nothing;

-- Funcionários de exemplo (autorização permanente)
with novos as (
  insert into pessoa (tipo_pessoa, nome_completo, cpf, email) values
    ('FUNCIONARIO', 'Marina Alves', '39053344705', 'marina.alves@exemplo.com'),
    ('FUNCIONARIO', 'Carlos Pereira', '11144477735', 'carlos.pereira@exemplo.com')
  on conflict do nothing returning id, cpf
)
insert into funcionario (pessoa_id, matricula, setor_id)
select n.id, case n.cpf when '39053344705' then 'F0001' else 'F0002' end,
       (select id from setor where nome = case n.cpf when '39053344705' then 'Recursos Humanos' else 'Produção' end)
from novos n;

insert into autorizacao_acesso (pessoa_id, valido_de, valido_ate)
select p.id, now() - interval '1 day', null from pessoa p
where p.tipo_pessoa = 'FUNCIONARIO' and not exists (select 1 from autorizacao_acesso a where a.pessoa_id = p.id);
