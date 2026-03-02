-- Clinix Power - schema e RLS principais
-- FASE 1: Backend crítico (BD + RLS)

-- EXTENSÕES ÚTEIS ------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- PERFIS ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nome text,
  role text not null check (role in ('ADMIN','FUNCIONARIO')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles
  alter column is_active set default true;

alter table public.profiles enable row level security;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Nenhuma policy de insert/update/delete para clientes:
-- somente service_role (Edge Functions) pode gerenciar perfis.

-- PACIENTES ------------------------------------------------------------------
create table if not exists public.pacientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  data_nascimento date,
  created_at timestamptz not null default now()
);

-- Adicionar coluna responsavel_id se não existir (idempotente)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'pacientes' 
    and column_name = 'responsavel_id'
  ) then
    alter table public.pacientes 
    add column responsavel_id uuid references auth.users(id) on delete set null;
  end if;
end $$;

alter table public.pacientes enable row level security;

drop policy if exists "pacientes select admin" on public.pacientes;
drop policy if exists "pacientes select funcionario own" on public.pacientes;
drop policy if exists "pacientes insert admin" on public.pacientes;
drop policy if exists "pacientes insert funcionario own" on public.pacientes;
drop policy if exists "pacientes update admin" on public.pacientes;
drop policy if exists "pacientes update funcionario own" on public.pacientes;
drop policy if exists "pacientes delete admin" on public.pacientes;
drop policy if exists "pacientes delete funcionario own" on public.pacientes;

create policy "pacientes select admin"
  on public.pacientes
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'ADMIN'
        and p.is_active
    )
  );

create policy "pacientes select funcionario own"
  on public.pacientes
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'FUNCIONARIO'
        and p.is_active
    )
    and responsavel_id = auth.uid()
  );

create policy "pacientes insert admin"
  on public.pacientes
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'ADMIN'
        and p.is_active
    )
  );

create policy "pacientes insert funcionario own"
  on public.pacientes
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'FUNCIONARIO'
        and p.is_active
    )
    and responsavel_id = auth.uid()
  );

create policy "pacientes update admin"
  on public.pacientes
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'ADMIN'
        and p.is_active
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'ADMIN'
        and p.is_active
    )
  );

create policy "pacientes update funcionario own"
  on public.pacientes
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'FUNCIONARIO'
        and p.is_active
    )
    and responsavel_id = auth.uid()
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'FUNCIONARIO'
        and p.is_active
    )
    and responsavel_id = auth.uid()
  );

create policy "pacientes delete admin"
  on public.pacientes
  for delete
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'ADMIN'
        and p.is_active
    )
  );

create policy "pacientes delete funcionario own"
  on public.pacientes
  for delete
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'FUNCIONARIO'
        and p.is_active
    )
    and responsavel_id = auth.uid()
  );

-- AGENDAMENTOS ---------------------------------------------------------------
create table if not exists public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  paciente_nome text not null,
  data date not null,
  hora time,
  observacoes text,
  created_at timestamptz not null default now()
);

-- Adicionar coluna funcionario_id se não existir (idempotente)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'agendamentos' 
    and column_name = 'funcionario_id'
  ) then
    alter table public.agendamentos 
    add column funcionario_id uuid references auth.users(id) on delete cascade;
  end if;
end $$;

-- Índice de conflito por profissional/data/hora (se horário informado)
do $$
begin
  if not exists (
    select 1 from pg_indexes 
    where schemaname = 'public' 
    and tablename = 'agendamentos' 
    and indexname = 'agendamentos_profissional_data_hora_uniq'
  ) then
    create unique index agendamentos_profissional_data_hora_uniq
    on public.agendamentos (funcionario_id, data, hora)
    where hora is not null;
  end if;
end $$;

alter table public.agendamentos enable row level security;

drop policy if exists "agendamentos select admin" on public.agendamentos;
drop policy if exists "agendamentos select funcionario own" on public.agendamentos;
drop policy if exists "agendamentos insert admin" on public.agendamentos;
drop policy if exists "agendamentos insert funcionario own" on public.agendamentos;
drop policy if exists "agendamentos update admin" on public.agendamentos;
drop policy if exists "agendamentos update funcionario own" on public.agendamentos;
drop policy if exists "agendamentos delete admin" on public.agendamentos;
drop policy if exists "agendamentos delete funcionario own" on public.agendamentos;

create policy "agendamentos select admin"
  on public.agendamentos
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'ADMIN'
        and p.is_active
    )
  );

create policy "agendamentos select funcionario own"
  on public.agendamentos
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'FUNCIONARIO'
        and p.is_active
    )
    and funcionario_id = auth.uid()
  );

create policy "agendamentos insert admin"
  on public.agendamentos
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'ADMIN'
        and p.is_active
    )
  );

create policy "agendamentos insert funcionario own"
  on public.agendamentos
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'FUNCIONARIO'
        and p.is_active
    )
    and funcionario_id = auth.uid()
  );

create policy "agendamentos update admin"
  on public.agendamentos
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'ADMIN'
        and p.is_active
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'ADMIN'
        and p.is_active
    )
  );

create policy "agendamentos update funcionario own"
  on public.agendamentos
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'FUNCIONARIO'
        and p.is_active
    )
    and funcionario_id = auth.uid()
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'FUNCIONARIO'
        and p.is_active
    )
    and funcionario_id = auth.uid()
  );

create policy "agendamentos delete admin"
  on public.agendamentos
  for delete
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'ADMIN'
        and p.is_active
    )
  );

create policy "agendamentos delete funcionario own"
  on public.agendamentos
  for delete
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'FUNCIONARIO'
        and p.is_active
    )
    and funcionario_id = auth.uid()
  );

-- EVOLUÇÕES CLÍNICAS ---------------------------------------------------------
create table if not exists public.evolucoes_clinicas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid not null references auth.users(id) on delete cascade,
  data_hora timestamptz not null default now(),
  texto text not null
);

alter table public.evolucoes_clinicas enable row level security;

drop policy if exists "evolucoes select admin" on public.evolucoes_clinicas;
drop policy if exists "evolucoes select profissional own" on public.evolucoes_clinicas;
drop policy if exists "evolucoes insert profissional own" on public.evolucoes_clinicas;
drop policy if exists "evolucoes update profissional own" on public.evolucoes_clinicas;
drop policy if exists "evolucoes delete profissional own" on public.evolucoes_clinicas;

create policy "evolucoes select admin"
  on public.evolucoes_clinicas
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'ADMIN'
        and p.is_active
    )
  );

create policy "evolucoes select profissional own"
  on public.evolucoes_clinicas
  for select
  using (profissional_id = auth.uid());

create policy "evolucoes insert profissional own"
  on public.evolucoes_clinicas
  for insert
  with check (profissional_id = auth.uid());

create policy "evolucoes update profissional own"
  on public.evolucoes_clinicas
  for update
  using (profissional_id = auth.uid())
  with check (profissional_id = auth.uid());

create policy "evolucoes delete profissional own"
  on public.evolucoes_clinicas
  for delete
  using (profissional_id = auth.uid());

