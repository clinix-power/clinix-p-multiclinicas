-- ============================================================================
-- CLINIX POWER MULTI - TRANSFORMAÇÃO EM SAAS MULTICLÍNICAS
-- Arquitetura Multitenancy Completa com Sistema de Pagamentos
-- Data: 26/02/2026
-- ============================================================================

-- EXTENSÕES NECESSÁRIAS -----------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- PARTE 1: TABELAS CORE DO SAAS (MULTITENANCY)
-- ============================================================================

-- TABELA DE PLANOS -----------------------------------------------------------
create table if not exists public.planos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text,
  valor_mensal numeric(10,2) not null,
  valor_ativacao numeric(10,2) not null default 19.90,
  dias_teste integer not null default 30,
  max_usuarios integer,
  max_pacientes integer,
  recursos jsonb default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.planos is 'Planos de assinatura do SaaS';
comment on column public.planos.valor_ativacao is 'Valor de ativação para filtrar leads qualificados (R$ 19,90)';
comment on column public.planos.dias_teste is 'Dias de teste gratuito após pagamento de ativação';
comment on column public.planos.recursos is 'JSON com recursos: {"ia_evolucoes": true, "laudos": true, "financeiro": true}';

-- TABELA DE CLÍNICAS (ORGANIZATIONS) -----------------------------------------
create table if not exists public.clinicas (
  id uuid primary key default gen_random_uuid(),
  nome_fantasia text not null,
  razao_social text,
  cnpj text unique,
  email text not null unique,
  telefone text,
  endereco_completo text,
  cidade text,
  estado text,
  cep text,
  
  -- DADOS DO RESPONSÁVEL
  responsavel_nome text not null,
  responsavel_email text not null,
  responsavel_telefone text,
  
  -- PLANO E STATUS
  plano_id uuid references public.planos(id) on delete restrict,
  status text not null check (status in ('TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED')) default 'TRIAL',
  data_cadastro timestamptz not null default now(),
  data_ativacao timestamptz,
  data_expiracao_trial timestamptz,
  data_cancelamento timestamptz,
  
  -- PAGAMENTO
  pagamento_ativacao_confirmado boolean not null default false,
  pagamento_ativacao_data timestamptz,
  pagamento_ativacao_transaction_id text,
  
  -- ASSINATURA
  assinatura_ativa boolean not null default false,
  assinatura_vencimento date,
  assinatura_transaction_id text,
  
  -- METADADOS
  metadados jsonb default '{}'::jsonb,
  
  -- CONTROLE
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.clinicas is 'Clínicas cadastradas no SaaS (multitenancy)';
comment on column public.clinicas.status is 'TRIAL: teste 30 dias | ACTIVE: assinatura ativa | SUSPENDED: suspensa | CANCELLED: cancelada';
comment on column public.clinicas.pagamento_ativacao_confirmado is 'Se pagou R$ 19,90 para ativar teste';

-- Índices para performance
create index if not exists clinicas_plano_id_idx on public.clinicas(plano_id);
create index if not exists clinicas_status_idx on public.clinicas(status);
create index if not exists clinicas_email_idx on public.clinicas(email);
create index if not exists clinicas_cnpj_idx on public.clinicas(cnpj);

-- TABELA DE PAGAMENTOS -------------------------------------------------------
create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  tipo text not null check (tipo in ('ATIVACAO', 'ASSINATURA', 'RENOVACAO')),
  valor numeric(10,2) not null,
  status text not null check (status in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED')) default 'PENDING',
  
  -- GATEWAY DE PAGAMENTO
  gateway text not null default 'APPMAX',
  transaction_id text unique,
  payment_method text,
  
  -- DADOS DO PAGAMENTO
  data_pagamento timestamptz,
  data_aprovacao timestamptz,
  data_vencimento date,
  
  -- WEBHOOK
  webhook_payload jsonb,
  webhook_recebido_em timestamptz,
  
  -- METADADOS
  metadados jsonb default '{}'::jsonb,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pagamentos is 'Histórico de pagamentos das clínicas';
comment on column public.pagamentos.tipo is 'ATIVACAO: R$ 19,90 | ASSINATURA: mensal | RENOVACAO: renovação';

create index if not exists pagamentos_clinica_id_idx on public.pagamentos(clinica_id);
create index if not exists pagamentos_transaction_id_idx on public.pagamentos(transaction_id);
create index if not exists pagamentos_status_idx on public.pagamentos(status);

-- TABELA DE WEBHOOKS ---------------------------------------------------------
create table if not exists public.webhooks_log (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  payload jsonb not null,
  headers jsonb,
  processado boolean not null default false,
  erro text,
  created_at timestamptz not null default now()
);

comment on table public.webhooks_log is 'Log de webhooks recebidos do gateway de pagamento';

create index if not exists webhooks_log_processado_idx on public.webhooks_log(processado);
create index if not exists webhooks_log_created_at_idx on public.webhooks_log(created_at desc);

-- ============================================================================
-- PARTE 2: MIGRAÇÃO DAS TABELAS EXISTENTES PARA MULTITENANCY
-- ============================================================================

-- TABELAS LEGADAS -----------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nome text,
  role text not null check (role in ('ADMIN','FUNCIONARIO')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pacientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  data_nascimento date,
  responsavel_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  paciente_nome text not null,
  data date not null,
  hora time,
  observacoes text,
  funcionario_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.evolucoes_clinicas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid not null references auth.users(id) on delete cascade,
  data_hora timestamptz not null default now(),
  texto text not null
);

create table if not exists public.anamneses (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid not null references auth.users(id) on delete cascade,
  data_avaliacao timestamptz not null default now(),
  qp text,
  hda text,
  exames_complementares text,
  diagnostico_fisio text,
  conduta text,
  assinatura_digital text,
  metadados jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.configuracoes_clinica (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references public.clinicas(id) on delete cascade,
  nome_fantasia text not null,
  endereco_completo text not null,
  responsavel_tecnico text not null,
  documento_responsavel text not null,
  tipo_documento text not null check (tipo_documento in ('CPF', 'CNPJ', 'RG')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ADICIONAR clinica_id em PROFILES -------------------------------------------
alter table public.profiles 
  add column if not exists clinica_id uuid references public.clinicas(id) on delete cascade;

alter table public.profiles
  add column if not exists is_master_admin boolean not null default false;

create index if not exists profiles_clinica_id_idx on public.profiles(clinica_id);

comment on column public.profiles.clinica_id is 'Clínica à qual o usuário pertence';
comment on column public.profiles.is_master_admin is 'Admin Master do SaaS (dono do sistema)';

-- ADICIONAR clinica_id em PACIENTES ------------------------------------------
alter table public.pacientes 
  add column if not exists clinica_id uuid references public.clinicas(id) on delete cascade;

create index if not exists pacientes_clinica_id_idx on public.pacientes(clinica_id);

-- ADICIONAR clinica_id em AGENDAMENTOS ---------------------------------------
alter table public.agendamentos 
  add column if not exists clinica_id uuid references public.clinicas(id) on delete cascade;

create index if not exists agendamentos_clinica_id_idx on public.agendamentos(clinica_id);

-- ADICIONAR clinica_id em EVOLUCOES_CLINICAS ---------------------------------
alter table public.evolucoes_clinicas 
  add column if not exists clinica_id uuid references public.clinicas(id) on delete cascade;

create index if not exists evolucoes_clinicas_clinica_id_idx on public.evolucoes_clinicas(clinica_id);

-- ADICIONAR clinica_id em ANAMNESES ------------------------------------------
alter table public.anamneses 
  add column if not exists clinica_id uuid references public.clinicas(id) on delete cascade;

create index if not exists anamneses_clinica_id_idx on public.anamneses(clinica_id);

-- MIGRAR CONFIGURACOES_CLINICA (já tem clinica_id) ---------------------------
-- Tabela já está preparada, apenas garantir que está correta

-- ============================================================================
-- PARTE 3: ROW LEVEL SECURITY (RLS) MULTITENANCY
-- ============================================================================

-- RLS para PLANOS (público para leitura) -------------------------------------
alter table public.planos enable row level security;

drop policy if exists "planos_select_public" on public.planos;
drop policy if exists "planos_all_master_admin" on public.planos;

create policy "planos_select_public"
  on public.planos
  for select
  using (ativo = true);

create policy "planos_all_master_admin"
  on public.planos
  for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_master_admin = true
    )
  );

-- RLS para CLINICAS -----------------------------------------------------------
alter table public.clinicas enable row level security;

drop policy if exists "clinicas_select_own" on public.clinicas;
drop policy if exists "clinicas_update_own_admin" on public.clinicas;
drop policy if exists "clinicas_all_master_admin" on public.clinicas;

-- Usuários veem apenas sua própria clínica
create policy "clinicas_select_own"
  on public.clinicas
  for select
  using (
    id in (
      select clinica_id from public.profiles
      where id = auth.uid()
    )
  );

-- Admin da clínica pode atualizar dados da própria clínica
create policy "clinicas_update_own_admin"
  on public.clinicas
  for update
  using (
    id in (
      select clinica_id from public.profiles
      where id = auth.uid() and role = 'ADMIN'
    )
  );

-- Master Admin vê e gerencia tudo
create policy "clinicas_all_master_admin"
  on public.clinicas
  for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_master_admin = true
    )
  );

-- RLS para PAGAMENTOS ---------------------------------------------------------
alter table public.pagamentos enable row level security;

drop policy if exists "pagamentos_select_own_clinic" on public.pagamentos;
drop policy if exists "pagamentos_all_master_admin" on public.pagamentos;

create policy "pagamentos_select_own_clinic"
  on public.pagamentos
  for select
  using (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and role = 'ADMIN'
    )
  );

create policy "pagamentos_all_master_admin"
  on public.pagamentos
  for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_master_admin = true
    )
  );

-- RLS para WEBHOOKS_LOG (apenas Master Admin) --------------------------------
alter table public.webhooks_log enable row level security;

drop policy if exists "webhooks_all_master_admin" on public.webhooks_log;

create policy "webhooks_all_master_admin"
  on public.webhooks_log
  for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_master_admin = true
    )
  );

-- ============================================================================
-- PARTE 4: ATUALIZAR RLS DAS TABELAS EXISTENTES COM ISOLAMENTO POR CLÍNICA
-- ============================================================================

-- PROFILES: Isolamento por clínica -------------------------------------------
drop policy if exists "profiles select own" on public.profiles;
drop policy if exists "profiles_select_own_or_same_clinic" on public.profiles;

create policy "profiles_select_own_or_same_clinic"
  on public.profiles
  for select
  using (
    auth.uid() = id 
    or 
    (
      clinica_id in (
        select clinica_id from public.profiles
        where id = auth.uid() and role = 'ADMIN'
      )
    )
    or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_master_admin = true
    )
  );

-- PACIENTES: Isolamento por clínica ------------------------------------------
drop policy if exists "pacientes select admin" on public.pacientes;
drop policy if exists "pacientes select funcionario own" on public.pacientes;
drop policy if exists "pacientes insert admin" on public.pacientes;
drop policy if exists "pacientes insert funcionario own" on public.pacientes;
drop policy if exists "pacientes update admin" on public.pacientes;
drop policy if exists "pacientes update funcionario own" on public.pacientes;
drop policy if exists "pacientes delete admin" on public.pacientes;
drop policy if exists "pacientes delete funcionario own" on public.pacientes;

create policy "pacientes_select_same_clinic"
  on public.pacientes
  for select
  using (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and is_active
    )
    or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_master_admin = true
    )
  );

create policy "pacientes_insert_same_clinic"
  on public.pacientes
  for insert
  with check (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and is_active
    )
  );

create policy "pacientes_update_same_clinic"
  on public.pacientes
  for update
  using (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and is_active
    )
  )
  with check (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and is_active
    )
  );

create policy "pacientes_delete_same_clinic_admin"
  on public.pacientes
  for delete
  using (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and role = 'ADMIN' and is_active
    )
  );

-- AGENDAMENTOS: Isolamento por clínica ---------------------------------------
drop policy if exists "agendamentos select admin" on public.agendamentos;
drop policy if exists "agendamentos select funcionario own" on public.agendamentos;
drop policy if exists "agendamentos insert admin" on public.agendamentos;
drop policy if exists "agendamentos insert funcionario own" on public.agendamentos;
drop policy if exists "agendamentos update admin" on public.agendamentos;
drop policy if exists "agendamentos update funcionario own" on public.agendamentos;
drop policy if exists "agendamentos delete admin" on public.agendamentos;
drop policy if exists "agendamentos delete funcionario own" on public.agendamentos;

create policy "agendamentos_select_same_clinic"
  on public.agendamentos
  for select
  using (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and is_active
    )
    or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_master_admin = true
    )
  );

create policy "agendamentos_insert_same_clinic"
  on public.agendamentos
  for insert
  with check (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and is_active
    )
  );

create policy "agendamentos_update_same_clinic"
  on public.agendamentos
  for update
  using (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and is_active
    )
  )
  with check (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and is_active
    )
  );

create policy "agendamentos_delete_same_clinic"
  on public.agendamentos
  for delete
  using (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and is_active
    )
  );

-- EVOLUCOES_CLINICAS: Isolamento por clínica ---------------------------------
drop policy if exists "evolucoes select admin" on public.evolucoes_clinicas;
drop policy if exists "evolucoes select profissional own" on public.evolucoes_clinicas;
drop policy if exists "evolucoes insert profissional own" on public.evolucoes_clinicas;
drop policy if exists "evolucoes update profissional own" on public.evolucoes_clinicas;
drop policy if exists "evolucoes delete profissional own" on public.evolucoes_clinicas;

create policy "evolucoes_select_same_clinic"
  on public.evolucoes_clinicas
  for select
  using (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and is_active
    )
    or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_master_admin = true
    )
  );

create policy "evolucoes_insert_same_clinic"
  on public.evolucoes_clinicas
  for insert
  with check (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and is_active
    )
    and profissional_id = auth.uid()
  );

create policy "evolucoes_update_own"
  on public.evolucoes_clinicas
  for update
  using (profissional_id = auth.uid())
  with check (profissional_id = auth.uid());

create policy "evolucoes_delete_own"
  on public.evolucoes_clinicas
  for delete
  using (profissional_id = auth.uid());

-- ANAMNESES: Isolamento por clínica ------------------------------------------
drop policy if exists "anamneses_select_admin" on public.anamneses;
drop policy if exists "anamneses_select_profissional_own" on public.anamneses;
drop policy if exists "anamneses_insert_profissional" on public.anamneses;
drop policy if exists "anamneses_update_profissional_own" on public.anamneses;
drop policy if exists "anamneses_delete_admin" on public.anamneses;
drop policy if exists "anamneses_insert_admin" on public.anamneses;

create policy "anamneses_select_same_clinic"
  on public.anamneses
  for select
  using (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and is_active
    )
    or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_master_admin = true
    )
  );

create policy "anamneses_insert_same_clinic"
  on public.anamneses
  for insert
  with check (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and is_active
    )
    and profissional_id = auth.uid()
  );

create policy "anamneses_update_own"
  on public.anamneses
  for update
  using (profissional_id = auth.uid())
  with check (profissional_id = auth.uid());

create policy "anamneses_delete_same_clinic_admin"
  on public.anamneses
  for delete
  using (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and role = 'ADMIN' and is_active
    )
  );

-- CONFIGURACOES_CLINICA: Isolamento por clínica ------------------------------
drop policy if exists "configuracoes_select_admin" on public.configuracoes_clinica;
drop policy if exists "configuracoes_insert_admin" on public.configuracoes_clinica;
drop policy if exists "configuracoes_update_admin" on public.configuracoes_clinica;
drop policy if exists "configuracoes_delete_admin" on public.configuracoes_clinica;

create policy "configuracoes_select_same_clinic"
  on public.configuracoes_clinica
  for select
  using (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and is_active
    )
    or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_master_admin = true
    )
  );

create policy "configuracoes_insert_same_clinic_admin"
  on public.configuracoes_clinica
  for insert
  with check (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and role = 'ADMIN' and is_active
    )
  );

create policy "configuracoes_update_same_clinic_admin"
  on public.configuracoes_clinica
  for update
  using (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and role = 'ADMIN' and is_active
    )
  )
  with check (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and role = 'ADMIN' and is_active
    )
  );

create policy "configuracoes_delete_same_clinic_admin"
  on public.configuracoes_clinica
  for delete
  using (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and role = 'ADMIN' and is_active
    )
  );

-- ============================================================================
-- PARTE 5: FUNÇÕES E TRIGGERS
-- ============================================================================

-- Função para atualizar updated_at -------------------------------------------
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers para updated_at
drop trigger if exists planos_updated_at on public.planos;
create trigger planos_updated_at
  before update on public.planos
  for each row execute function update_updated_at_column();

drop trigger if exists clinicas_updated_at on public.clinicas;
create trigger clinicas_updated_at
  before update on public.clinicas
  for each row execute function update_updated_at_column();

drop trigger if exists pagamentos_updated_at on public.pagamentos;
create trigger pagamentos_updated_at
  before update on public.pagamentos
  for each row execute function update_updated_at_column();

-- Função para processar pagamento de ativação ---------------------------------
create or replace function processar_pagamento_ativacao(
  p_clinica_id uuid,
  p_transaction_id text,
  p_payment_method text default 'PIX'
)
returns void as $$
declare
  v_plano_id uuid;
  v_dias_teste integer;
begin
  -- Buscar plano da clínica
  select plano_id into v_plano_id
  from public.clinicas
  where id = p_clinica_id;
  
  -- Buscar dias de teste do plano
  select dias_teste into v_dias_teste
  from public.planos
  where id = v_plano_id;
  
  -- Atualizar clínica
  update public.clinicas
  set 
    pagamento_ativacao_confirmado = true,
    pagamento_ativacao_data = now(),
    pagamento_ativacao_transaction_id = p_transaction_id,
    data_ativacao = now(),
    data_expiracao_trial = now() + (v_dias_teste || ' days')::interval,
    status = 'TRIAL'
  where id = p_clinica_id;
  
  -- Atualizar pagamento
  update public.pagamentos
  set 
    status = 'APPROVED',
    data_aprovacao = now(),
    payment_method = p_payment_method
  where transaction_id = p_transaction_id;
  
end;
$$ language plpgsql security definer;

-- Função para processar pagamento de assinatura -------------------------------
create or replace function processar_pagamento_assinatura(
  p_clinica_id uuid,
  p_transaction_id text,
  p_payment_method text default 'PIX'
)
returns void as $$
begin
  -- Atualizar clínica
  update public.clinicas
  set 
    assinatura_ativa = true,
    assinatura_transaction_id = p_transaction_id,
    assinatura_vencimento = (current_date + interval '1 month')::date,
    status = 'ACTIVE'
  where id = p_clinica_id;
  
  -- Atualizar pagamento
  update public.pagamentos
  set 
    status = 'APPROVED',
    data_aprovacao = now(),
    payment_method = p_payment_method
  where transaction_id = p_transaction_id;
  
end;
$$ language plpgsql security definer;

-- Função para verificar status da clínica ------------------------------------
create or replace function verificar_status_clinica(p_clinica_id uuid)
returns text as $$
declare
  v_status text;
  v_trial_expirado boolean;
  v_assinatura_vencida boolean;
  v_pagamento_ativacao boolean;
begin
  select 
    status,
    (data_expiracao_trial < now()) as trial_expirado,
    (assinatura_vencimento < current_date) as assinatura_vencida,
    pagamento_ativacao_confirmado
  into v_status, v_trial_expirado, v_assinatura_vencida, v_pagamento_ativacao
  from public.clinicas
  where id = p_clinica_id;
  
  -- Se não pagou ativação, retorna SUSPENDED
  if not v_pagamento_ativacao then
    return 'SUSPENDED';
  end if;
  
  -- Se está em trial e expirou, retorna SUSPENDED
  if v_status = 'TRIAL' and v_trial_expirado then
    return 'SUSPENDED';
  end if;
  
  -- Se está ativo mas assinatura venceu, retorna SUSPENDED
  if v_status = 'ACTIVE' and v_assinatura_vencida then
    return 'SUSPENDED';
  end if;
  
  return v_status;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- PARTE 6: DADOS INICIAIS (SEED)
-- ============================================================================

-- SEED: Inserir planos iniciais ----------------------------------------------
insert into public.planos (nome, descricao, valor_mensal, valor_ativacao, dias_teste, max_usuarios, max_pacientes, recursos, ativo)
values
  (
    'PRO',
    'Transforme sua clínica pequena em GIGANTE com IA',
    99.90,
    19.90,
    30,
    5,
    null,
    '{"evolucoes_ia": true, "assinatura_digital": true, "laudos_pdf_crefito": true, "relatorios_pdf": true, "fim_papelada": true, "modo_admin": true, "modo_funcionario": true, "gestao_financeira_completa": true, "suporte_prioritario": true}'::jsonb,
    true
  ),
  (
    'ULTIMATE',
    'Ilimitado + IA Consultora Financeira para Clínicas Grandes',
    249.90,
    19.90,
    30,
    null,
    null,
    '{"evolucoes_ia": true, "assinatura_digital": true, "laudos_pdf_crefito": true, "relatorios_pdf": true, "fim_papelada": true, "modo_admin": true, "modo_funcionario": true, "gestao_financeira_ultimate": true, "dashboard_banking": true, "graficos_desenvolvimento": true, "alertas_perda_pacientes": true, "calendario_impostos": true, "ia_consultora_financeira": true, "inteligencia_dados": true, "suporte_vip_24h": true, "funcionarios_ilimitados": true, "pacientes_ilimitados": true, "evolucoes_ilimitadas": true, "laudos_ilimitados": true}'::jsonb,
    true
  )
on conflict (nome) do nothing;

-- ============================================================================
-- PARTE 7: VIEWS PARA ANALYTICS (PAINEL MASTER ADMIN)
-- ============================================================================

-- View de métricas gerais do SaaS --------------------------------------------
create or replace view public.saas_metricas as
select
  (select count(*) from public.clinicas where is_active = true) as total_clinicas,
  (select count(*) from public.clinicas where status = 'TRIAL') as clinicas_trial,
  (select count(*) from public.clinicas where status = 'ACTIVE') as clinicas_ativas,
  (select count(*) from public.clinicas where status = 'SUSPENDED') as clinicas_suspensas,
  (select count(*) from public.clinicas where status = 'CANCELLED') as clinicas_canceladas,
  (select count(*) from public.profiles where is_active = true and not is_master_admin) as total_usuarios,
  (select count(*) from public.pacientes) as total_pacientes,
  (select sum(valor) from public.pagamentos where status = 'APPROVED' and tipo = 'ATIVACAO') as receita_ativacao,
  (select sum(valor) from public.pagamentos where status = 'APPROVED' and tipo = 'ASSINATURA') as receita_assinaturas,
  (select sum(valor) from public.pagamentos where status = 'APPROVED') as receita_total,
  (select count(*) from public.clinicas where data_cadastro >= current_date - interval '30 days') as cadastros_ultimos_30_dias,
  (select count(*) from public.pagamentos where status = 'APPROVED' and data_aprovacao >= current_date - interval '30 days') as pagamentos_ultimos_30_dias;

comment on view public.saas_metricas is 'Métricas gerais do SaaS para o Painel Master Admin';

-- View de clínicas com detalhes -----------------------------------------------
create or replace view public.saas_clinicas_detalhes as
select
  c.id,
  c.nome_fantasia,
  c.razao_social,
  c.cnpj,
  c.email,
  c.telefone,
  c.cidade,
  c.estado,
  c.responsavel_nome,
  c.responsavel_email,
  c.status,
  c.data_cadastro,
  c.data_ativacao,
  c.data_expiracao_trial,
  c.pagamento_ativacao_confirmado,
  c.assinatura_ativa,
  c.assinatura_vencimento,
  p.nome as plano_nome,
  p.valor_mensal as plano_valor,
  (select count(*) from public.profiles where clinica_id = c.id and is_active = true) as total_usuarios,
  (select count(*) from public.pacientes where clinica_id = c.id) as total_pacientes,
  (select count(*) from public.evolucoes_clinicas where clinica_id = c.id) as total_evolucoes,
  (select sum(valor) from public.pagamentos where clinica_id = c.id and status = 'APPROVED') as receita_total
from public.clinicas c
left join public.planos p on c.plano_id = p.id
where c.is_active = true;

comment on view public.saas_clinicas_detalhes is 'Detalhes completos das clínicas para o Painel Master Admin';

-- ============================================================================
-- PARTE 8: FUNÇÕES PARA API DE CADASTRO DE CLÍNICAS
-- ============================================================================

-- Função para criar nova clínica (chamada via Edge Function) -----------------
create or replace function criar_clinica_trial(
  p_nome_fantasia text,
  p_email text,
  p_responsavel_nome text,
  p_responsavel_email text,
  p_telefone text default null,
  p_plano_nome text default 'Starter'
)
returns uuid as $$
declare
  v_clinica_id uuid;
  v_plano_id uuid;
begin
  -- Buscar plano
  select id into v_plano_id
  from public.planos
  where nome = p_plano_nome and ativo = true;
  
  if v_plano_id is null then
    raise exception 'Plano não encontrado';
  end if;
  
  -- Criar clínica
  insert into public.clinicas (
    nome_fantasia,
    email,
    responsavel_nome,
    responsavel_email,
    telefone,
    plano_id,
    status
  )
  values (
    p_nome_fantasia,
    p_email,
    p_responsavel_nome,
    p_responsavel_email,
    p_telefone,
    v_plano_id,
    'TRIAL'
  )
  returning id into v_clinica_id;
  
  return v_clinica_id;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================

-- Mensagem de sucesso
do $$
begin
  raise notice '✅ CLINIX POWER MULTI - TRANSFORMAÇÃO EM SAAS CONCLUÍDA!';
  raise notice '📊 Tabelas criadas: planos, clinicas, pagamentos, webhooks_log';
  raise notice '🔒 RLS configurado com isolamento total por clínica';
  raise notice '🚀 Sistema pronto para escala industrial!';
end $$;
