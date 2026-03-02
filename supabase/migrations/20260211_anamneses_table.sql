-- ============================================================================
-- CLINIX POWER - TABELA ANAMNESES (AVALIAÇÃO FISIOTERAPÊUTICA)
-- Resolução COFFITO 414/2012 - Prontuário Fisioterapêutico
-- ============================================================================

-- TABELA ANAMNESES --------------------------------------------------------
create table if not exists public.anamneses (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid not null references auth.users(id) on delete cascade,
  data_avaliacao timestamptz not null default now(),
  
  -- DADOS DA ANAMNESE (COFFITO 414/2012)
  qp text, -- Queixa Principal
  hda text, -- História da Doença Atual
  exames_complementares text, -- Exames, laudos médicos, imagens
  diagnostico_fisio text, -- Diagnóstico Fisioterapêutico
  conduta text, -- Conduta e Plano de Tratamento
  
  -- ASSINATURA DIGITAL
  assinatura_digital text, -- Base64 da assinatura vetorial
  
  -- METADADOS (Botões Rápidos de Anamnese)
  metadados jsonb default '{}'::jsonb,
  -- Exemplo de estrutura:
  -- {
  --   "fumante": "Não",
  --   "atividade_fisica": "Sedentário",
  --   "historico_familiar": ["Diabetes", "Hipertensão"],
  --   "dor_eva": 7,
  --   "localizacao_dor": "Lombar",
  --   "irradiacao": "Membro inferior direito",
  --   "fatores_melhora": ["Repouso"],
  --   "fatores_piora": ["Movimento", "Esforço físico"]
  -- }
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices para performance
create index if not exists anamneses_paciente_id_idx on public.anamneses(paciente_id);
create index if not exists anamneses_profissional_id_idx on public.anamneses(profissional_id);
create index if not exists anamneses_data_avaliacao_idx on public.anamneses(data_avaliacao desc);

-- Trigger para atualizar updated_at
create or replace function update_anamneses_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists anamneses_updated_at_trigger on public.anamneses;
create trigger anamneses_updated_at_trigger
  before update on public.anamneses
  for each row
  execute function update_anamneses_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.anamneses enable row level security;

-- Limpar policies antigas (se existirem)
drop policy if exists "anamneses_select_admin" on public.anamneses;
drop policy if exists "anamneses_select_profissional_own" on public.anamneses;
drop policy if exists "anamneses_insert_profissional" on public.anamneses;
drop policy if exists "anamneses_update_profissional_own" on public.anamneses;
drop policy if exists "anamneses_delete_admin" on public.anamneses;
drop policy if exists "anamneses_insert_admin" on public.anamneses;

-- ADMIN: Acesso total (SELECT, INSERT, UPDATE, DELETE)
create policy "anamneses_select_admin"
  on public.anamneses
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

create policy "anamneses_insert_admin"
  on public.anamneses
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

-- FUNCIONÁRIO: SELECT apenas das próprias anamneses
create policy "anamneses_select_profissional_own"
  on public.anamneses
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'FUNCIONARIO'
        and p.is_active
    )
    and profissional_id = auth.uid()
  );

-- FUNCIONÁRIO: INSERT (criar nova anamnese)
create policy "anamneses_insert_profissional"
  on public.anamneses
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'FUNCIONARIO'
        and p.is_active
    )
    and profissional_id = auth.uid()
  );

-- FUNCIONÁRIO: UPDATE apenas das próprias anamneses
create policy "anamneses_update_profissional_own"
  on public.anamneses
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'FUNCIONARIO'
        and p.is_active
    )
    and profissional_id = auth.uid()
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'FUNCIONARIO'
        and p.is_active
    )
    and profissional_id = auth.uid()
  );

-- ADMIN: DELETE
create policy "anamneses_delete_admin"
  on public.anamneses
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

comment on table public.anamneses is 'Anamneses fisioterapêuticas seguindo Resolução COFFITO 414/2012';
comment on column public.anamneses.qp is 'Queixa Principal do paciente';
comment on column public.anamneses.hda is 'História da Doença Atual';
comment on column public.anamneses.exames_complementares is 'Exames complementares, laudos médicos, imagens';
comment on column public.anamneses.diagnostico_fisio is 'Diagnóstico Fisioterapêutico';
comment on column public.anamneses.conduta is 'Conduta e Plano de Tratamento';
comment on column public.anamneses.assinatura_digital is 'Assinatura digital do profissional em base64';
comment on column public.anamneses.metadados is 'Dados estruturados: fumante, atividade física, EVA, etc.';
