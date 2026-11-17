-- Sistema de Portaria Aços F Sacchelli — esquema (DER do documento técnico)

-- ---------- Segurança ----------
create table perfil (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (nome in ('PORTEIRO','GESTOR','ADMIN'))
);

create table permissao (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descricao text not null
);

create table perfil_permissao (
  perfil_id uuid not null references perfil(id) on delete cascade,
  permissao_id uuid not null references permissao(id) on delete cascade,
  primary key (perfil_id, permissao_id)
);

-- id = auth.users.id (Supabase Auth)
create table usuario (
  id uuid primary key references auth.users(id) on delete cascade,
  perfil_id uuid not null references perfil(id),
  nome text not null,
  login text not null unique,
  ativo boolean not null default true,
  ultimo_login_em timestamptz,
  criado_em timestamptz not null default now()
);

-- ---------- Pessoas ----------
create sequence pessoa_codigo_dispositivo_seq start 1001;

create table pessoa (
  id uuid primary key default gen_random_uuid(),
  tipo_pessoa text not null check (tipo_pessoa in ('VISITANTE','FUNCIONARIO')),
  nome_completo text not null,
  cpf char(11) not null unique check (cpf ~ '^[0-9]{11}$'),
  email text,
  telefone text,
  situacao text not null default 'ATIVA' check (situacao in ('ATIVA','INATIVA','BLOQUEADA')),
  -- UserID numérico enviado ao equipamento Intelbras
  codigo_dispositivo integer not null unique default nextval('pessoa_codigo_dispositivo_seq'),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table setor (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true
);

create table visitante (
  pessoa_id uuid primary key references pessoa(id) on delete cascade,
  cep char(8),
  logradouro_numero text,
  complemento text
);

create table funcionario (
  pessoa_id uuid primary key references pessoa(id) on delete cascade,
  matricula text not null unique,
  setor_id uuid not null references setor(id)
);

create table motivo_visita (
  id uuid primary key default gen_random_uuid(),
  descricao text not null unique,
  ativo boolean not null default true
);

-- ---------- Visitas e autorizações ----------
create table visita (
  id uuid primary key default gen_random_uuid(),
  visitante_id uuid not null references visitante(pessoa_id) on delete cascade,
  motivo_visita_id uuid not null references motivo_visita(id),
  funcionario_visitado_id uuid references funcionario(pessoa_id),
  setor_visitado_id uuid references setor(id),
  empresa_origem text,
  placa_veiculo text,
  situacao text not null default 'EM_ANDAMENTO' check (situacao in ('EM_ANDAMENTO','ENCERRADA','CANCELADA')),
  registrada_por uuid references usuario(id),
  criada_em timestamptz not null default now(),
  encerrada_em timestamptz,
  constraint visita_visitado check (funcionario_visitado_id is not null or setor_visitado_id is not null)
);

create table autorizacao_acesso (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references pessoa(id) on delete cascade,
  visita_id uuid unique references visita(id) on delete cascade,
  valido_de timestamptz not null default now(),
  valido_ate timestamptz,
  situacao text not null default 'ATIVA' check (situacao in ('ATIVA','REVOGADA','ENCERRADA')),
  concedida_por uuid references usuario(id),
  revogada_em timestamptz,
  motivo_revogacao text,
  criada_em timestamptz not null default now(),
  constraint autorizacao_periodo check (valido_ate is null or valido_ate > valido_de)
);

-- ---------- Dispositivos e biometria ----------
create table dispositivo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'LEITOR_FACIAL' check (tipo in ('LEITOR_FACIAL','CONTROLADOR','CATRACA')),
  sentido text not null default 'ENTRADA' check (sentido in ('ENTRADA','SAIDA','BIDIRECIONAL')),
  modo_integracao text not null default 'INTELBRAS_BIOT' check (modo_integracao in ('INTELBRAS_BIOT','INCONTROL_WEB','SIMULADOR')),
  identificador_externo text unique,
  endereco_rede text,
  localizacao text,
  situacao text not null default 'INDISPONIVEL' check (situacao in ('ATIVO','INDISPONIVEL','DESATIVADO')),
  ultimo_contato_em timestamptz,
  criado_em timestamptz not null default now()
);

-- Generaliza IDENTIFICACAO_FACIAL do PDF: face e digital
create table identificacao_biometrica (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references pessoa(id) on delete cascade,
  tipo text not null check (tipo in ('FACIAL','DIGITAL')),
  referencia_externa text,
  base_legal text not null,
  consentimento_em timestamptz,
  situacao text not null default 'PENDENTE_SINCRONIZACAO'
    check (situacao in ('PENDENTE_SINCRONIZACAO','SINCRONIZADA','ERRO_SINCRONIZACAO','REMOVIDA')),
  ultimo_erro text,
  criado_em timestamptz not null default now(),
  removida_em timestamptz,
  unique (pessoa_id, tipo)
);

-- ---------- Acessos e eventos ----------
create table registro_acesso (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid references pessoa(id) on delete set null,
  autorizacao_id uuid references autorizacao_acesso(id) on delete set null,
  dispositivo_id uuid references dispositivo(id) on delete set null,
  registrado_por uuid references usuario(id),
  tipo_movimento text not null check (tipo_movimento in ('ENTRADA','SAIDA')),
  origem text not null check (origem in ('RECONHECIMENTO_FACIAL','BIOMETRIA_DIGITAL','MANUAL_PORTEIRO','SIMULADOR')),
  resultado text not null check (resultado in ('LIBERADO','NEGADO','FALHA_TECNICA')),
  motivo_negativa text check (motivo_negativa in ('NAO_RECONHECIDO','PESSOA_NAO_CADASTRADA','SEM_AUTORIZACAO',
    'AUTORIZACAO_EXPIRADA','AUTORIZACAO_REVOGADA','PESSOA_BLOQUEADA','FALHA_RECONHECIMENTO','FALHA_COMUNICACAO','DISPOSITIVO_INDISPONIVEL')),
  data_hora timestamptz not null default now(),
  observacao text,
  constraint registro_motivo check ((resultado = 'LIBERADO') = (motivo_negativa is null))
);
create index registro_acesso_data_idx on registro_acesso (data_hora desc);
create index registro_acesso_pessoa_idx on registro_acesso (pessoa_id, data_hora desc);

create table evento_dispositivo (
  id uuid primary key default gen_random_uuid(),
  dispositivo_id uuid references dispositivo(id) on delete cascade,
  registro_acesso_id uuid references registro_acesso(id) on delete set null,
  tipo_evento text not null check (tipo_evento in ('IDENTIFICACAO_RECEBIDA','COMANDO_ENVIADO','COMANDO_CONFIRMADO',
    'SINCRONIZACAO_BIOMETRICA','FALHA_COMUNICACAO','DISPOSITIVO_INDISPONIVEL','AGENTE_CONECTADO')),
  data_hora timestamptz not null default now(),
  codigo_externo text,
  detalhe jsonb,
  sucesso boolean not null default true
);
create index evento_dispositivo_data_idx on evento_dispositivo (data_hora desc);

-- Fila de comandos executados pelo agente local
create table comando_dispositivo (
  id uuid primary key default gen_random_uuid(),
  -- ordem de execução (vários comandos criados no mesmo instante: usuário antes da face)
  seq bigint generated always as identity,
  dispositivo_id uuid not null references dispositivo(id) on delete cascade,
  pessoa_id uuid references pessoa(id) on delete cascade,
  tipo text not null check (tipo in ('CADASTRAR_USUARIO','CADASTRAR_FACE','CAPTURAR_DIGITAL','REMOVER_USUARIO','ABRIR_PORTA')),
  payload jsonb not null default '{}'::jsonb,
  situacao text not null default 'PENDENTE' check (situacao in ('PENDENTE','EXECUTANDO','CONCLUIDO','ERRO')),
  tentativas integer not null default 0,
  erro text,
  criado_em timestamptz not null default now(),
  executado_em timestamptz
);
create index comando_pendente_idx on comando_dispositivo (dispositivo_id, situacao, seq);

create table log_auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuario(id) on delete set null,
  data_hora timestamptz not null default now(),
  acao text not null,
  entidade text not null,
  entidade_id text,
  detalhe jsonb,
  ip_origem text
);
create index log_auditoria_data_idx on log_auditoria (data_hora desc);
