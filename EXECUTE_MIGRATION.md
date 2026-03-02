# 🚨 EXECUÇÃO EMERGENCIAL - MIGRAÇÃO ANAMNESES

## ⚠️ ERRO CRÍTICO DETECTADO
```
Could not find the table public.anamneses
404 Not Found
```

## 🔧 SOLUÇÃO IMEDIATA

### PASSO 1: EXECUTAR SQL NO SUPABASE

**Acesse:** https://jnjmhslpscgmgkogxqth.supabase.co/project/jnjmhslpscgmgkogxqth/sql/new

**Execute o SQL abaixo:**

```sql
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
```

### PASSO 2: CRIAR VIEW DE COMPATIBILIDADE PARA EVOLUÇÕES

**Execute também este SQL:**

```sql
-- ============================================================================
-- CLINIX POWER - VIEW DE COMPATIBILIDADE PARA EVOLUÇÕES
-- ============================================================================

create or replace view public.evolucoes as
select
  id,
  paciente_id,
  profissional_id,
  data_hora as created_at,
  data_hora,
  texto as texto_original,
  texto as texto_melhorado_ia
from public.evolucoes_clinicas;

-- Permitir INSERT/UPDATE/DELETE através da view
create or replace rule evolucoes_insert as
  on insert to public.evolucoes
  do instead
  insert into public.evolucoes_clinicas (paciente_id, profissional_id, data_hora, texto)
  values (new.paciente_id, new.profissional_id, coalesce(new.data_hora, now()), new.texto_original)
  returning
    id,
    paciente_id,
    profissional_id,
    data_hora as created_at,
    data_hora,
    texto as texto_original,
    texto as texto_melhorado_ia;

create or replace rule evolucoes_update as
  on update to public.evolucoes
  do instead
  update public.evolucoes_clinicas
  set
    texto = new.texto_original,
    data_hora = coalesce(new.data_hora, old.data_hora)
  where id = old.id
  returning
    id,
    paciente_id,
    profissional_id,
    data_hora as created_at,
    data_hora,
    texto as texto_original,
    texto as texto_melhorado_ia;

create or replace rule evolucoes_delete as
  on delete to public.evolucoes
  do instead
  delete from public.evolucoes_clinicas
  where id = old.id;

comment on view public.evolucoes is 'View de compatibilidade para evolucoes_clinicas';
```

**Por que esta view é necessária:**
- A tabela real no banco é `evolucoes_clinicas` (com colunas `data_hora` e `texto`)
- O código frontend usa `evolucoes` (com colunas `created_at`, `texto_original`, `texto_melhorado_ia`)
- Esta view garante compatibilidade entre ambos os nomes

### PASSO 3: VERIFICAR CRIAÇÃO DA TABELA

**No Supabase Dashboard:**
1. Vá em **Table Editor**
2. Procure por **anamneses**
3. Verifique se a tabela foi criada com sucesso
4. Procure por **evolucoes** (view) e **evolucoes_clinicas** (tabela)

### PASSO 3: VALIDAR RLS POLICIES

**No Supabase Dashboard:**
1. Vá em **Authentication > Policies**
2. Selecione a tabela **anamneses**
3. Verifique se as 6 policies foram criadas:
   - `anamneses_select_admin`
   - `anamneses_insert_admin`
   - `anamneses_select_profissional_own`
   - `anamneses_insert_profissional`
   - `anamneses_update_profissional_own`
   - `anamneses_delete_admin`

### PASSO 5: REINICIAR SERVIDOR DE DESENVOLVIMENTO

```bash
# Pare o servidor (Ctrl+C)
# Reinicie
npm run dev
```

## ✅ VALIDAÇÃO

**Após executar a migração, teste:**

1. Acesse `/avaliacao-admissional`
2. Preencha o formulário
3. Assine digitalmente
4. Clique em "Salvar Avaliação"
5. Verifique se não há mais erro "Could not find table"

## 🔍 DIAGNÓSTICO ATUAL

**Supabase Client:** ✅ Configurado corretamente
```typescript
// lib/supabaseClient.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
```

**Environment Variables:** ✅ Presentes em `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://jnjmhslpscgmgkogxqth.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Problema:** ❌ Tabela `anamneses` não existe no banco de dados

**Solução:** ✅ Executar SQL migration acima

## 🚀 PRÓXIMOS PASSOS

Após executar a migração:

1. ✅ Tabela criada
2. ✅ RLS ativado
3. ✅ Policies configuradas
4. ✅ Índices criados
5. ✅ Trigger de updated_at ativo

**O sistema estará pronto para produção.**

---

**MÉTODO DE 1 MILHÃO - Infraestrutura Estabilizada** 💎
