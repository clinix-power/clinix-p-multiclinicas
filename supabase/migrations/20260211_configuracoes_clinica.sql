-- ============================================================================
-- CLINIX POWER - CONFIGURAÇÕES DA CLÍNICA
-- Persistência de dados para geração de laudos
-- ============================================================================

-- TABELA CONFIGURACOES_CLINICA -----------------------------------------------
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

-- Índice para performance
create index if not exists configuracoes_clinica_clinica_id_idx 
  on public.configuracoes_clinica(clinica_id);

-- Trigger para atualizar updated_at
create or replace function update_configuracoes_clinica_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger configuracoes_clinica_updated_at_trigger
  before update on public.configuracoes_clinica
  for each row
  execute function update_configuracoes_clinica_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.configuracoes_clinica enable row level security;

-- Limpar policies antigas (se existirem)
drop policy if exists "configuracoes_select_admin" on public.configuracoes_clinica;
drop policy if exists "configuracoes_insert_admin" on public.configuracoes_clinica;
drop policy if exists "configuracoes_update_admin" on public.configuracoes_clinica;
drop policy if exists "configuracoes_delete_admin" on public.configuracoes_clinica;

-- ADMIN: Acesso total
create policy "configuracoes_select_admin"
  on public.configuracoes_clinica
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

create policy "configuracoes_insert_admin"
  on public.configuracoes_clinica
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

create policy "configuracoes_update_admin"
  on public.configuracoes_clinica
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

create policy "configuracoes_delete_admin"
  on public.configuracoes_clinica
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

-- ============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================

comment on table public.configuracoes_clinica is 'Configurações da clínica para geração de laudos';
comment on column public.configuracoes_clinica.nome_fantasia is 'Nome fantasia da clínica';
comment on column public.configuracoes_clinica.endereco_completo is 'Endereço completo da clínica';
comment on column public.configuracoes_clinica.responsavel_tecnico is 'Nome do responsável técnico';
comment on column public.configuracoes_clinica.documento_responsavel is 'CPF/CNPJ do responsável';
comment on column public.configuracoes_clinica.tipo_documento is 'Tipo de documento: CPF, CNPJ ou RG';
