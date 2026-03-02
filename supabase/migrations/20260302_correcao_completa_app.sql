-- ═══════════════════════════════════════════════════════════════════════════
-- CORREÇÃO COMPLETA DO APP — MULTI-CLÍNICA
-- Objetivo: Corrigir todos os erros de schema e RLS identificados
-- Data: 2026-03-02
-- IDEMPOTENTE — pode ser executado múltiplas vezes sem erro
-- ═══════════════════════════════════════════════════════════════════════════

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. COLUNAS FALTANDO EM PACIENTES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Ativo'
    CHECK (status IN ('Ativo', 'Inativo', 'Arquivado')),
  ADD COLUMN IF NOT EXISTS convenio text,
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_pacientes_clinica_id ON public.pacientes(clinica_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_status ON public.pacientes(clinica_id, status);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. COLUNAS FALTANDO EM PROFILES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profissao text,
  ADD COLUMN IF NOT EXISTS registro_tipo text,
  ADD COLUMN IF NOT EXISTS registro_numero text,
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_master_admin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_clinica_id ON public.profiles(clinica_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. COLUNAS FALTANDO EM AGENDAMENTOS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- paciente_nome era NOT NULL no schema original — tornamos nullable pois o app usa paciente_id
ALTER TABLE public.agendamentos
  ALTER COLUMN paciente_nome DROP NOT NULL;

-- funcionario_id era NOT NULL no schema antigo — app usa profissional_id agora
ALTER TABLE public.agendamentos
  ALTER COLUMN funcionario_id DROP NOT NULL;

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS clinica_id       uuid REFERENCES public.clinicas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS paciente_id      uuid REFERENCES public.pacientes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS profissional_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hora             time,
  ADD COLUMN IF NOT EXISTS status           text NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE','CONFIRMADO','RECUSADO','CANCELADO_ADMIN','CANCELADO_FUNCIONARIO','REALIZADO')),
  ADD COLUMN IF NOT EXISTS tipo_servico     text,
  ADD COLUMN IF NOT EXISTS tipo_servico_outro text,
  ADD COLUMN IF NOT EXISTS modalidade       text,
  ADD COLUMN IF NOT EXISTS observacoes      text,
  ADD COLUMN IF NOT EXISTS motivo_recusa    text,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento text,
  ADD COLUMN IF NOT EXISTS motivo_remarcacao   text,
  ADD COLUMN IF NOT EXISTS updated_at       timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by_role  text;

CREATE INDEX IF NOT EXISTS idx_agendamentos_clinica_id ON public.agendamentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON public.agendamentos(clinica_id, data);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. COLUNAS FALTANDO EM EVOLUCOES_CLINICAS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.evolucoes_clinicas
  ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_evolucoes_clinica_id ON public.evolucoes_clinicas(clinica_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. FUNÇÃO get_my_profile() — SEGURA E IDEMPOTENTE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP FUNCTION IF EXISTS public.get_my_profile() CASCADE;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE(
  id uuid,
  clinica_id uuid,
  role text,
  is_active boolean,
  is_master_admin boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.clinica_id,
    p.role,
    COALESCE(p.is_active, true) as is_active,
    COALESCE(p.is_master_admin, false) as is_master_admin
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. RLS — HABILITAR EM TODAS AS TABELAS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolucoes_clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamneses          ENABLE ROW LEVEL SECURITY;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7. RLS POLICIES — PROFILES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP POLICY IF EXISTS "profiles_select_v3"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_v3"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_v3"  ON public.profiles;

CREATE POLICY "profiles_select_v3" ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR clinica_id = (SELECT clinica_id FROM public.get_my_profile())
    OR (SELECT is_master_admin FROM public.get_my_profile())
  );

CREATE POLICY "profiles_insert_v3" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_v3" ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR (
      (SELECT role FROM public.get_my_profile()) = 'ADMIN'
      AND clinica_id = (SELECT clinica_id FROM public.get_my_profile())
    )
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 8. RLS POLICIES — CLINICAS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP POLICY IF EXISTS "clinicas_select_v3" ON public.clinicas;
DROP POLICY IF EXISTS "clinicas_update_v3" ON public.clinicas;

CREATE POLICY "clinicas_select_v3" ON public.clinicas FOR SELECT
  USING (
    id = (SELECT clinica_id FROM public.get_my_profile())
    OR (SELECT is_master_admin FROM public.get_my_profile())
  );

CREATE POLICY "clinicas_update_v3" ON public.clinicas FOR UPDATE
  USING (
    (
      id = (SELECT clinica_id FROM public.get_my_profile())
      AND (SELECT role FROM public.get_my_profile()) = 'ADMIN'
    )
    OR (SELECT is_master_admin FROM public.get_my_profile())
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 9. RLS POLICIES — PACIENTES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP POLICY IF EXISTS "pacientes_select_v3" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_insert_v3" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_update_v3" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_delete_v3" ON public.pacientes;

CREATE POLICY "pacientes_select_v3" ON public.pacientes FOR SELECT
  USING (
    clinica_id = (SELECT clinica_id FROM public.get_my_profile())
    OR (SELECT is_master_admin FROM public.get_my_profile())
  );

CREATE POLICY "pacientes_insert_v3" ON public.pacientes FOR INSERT
  WITH CHECK (clinica_id = (SELECT clinica_id FROM public.get_my_profile()));

CREATE POLICY "pacientes_update_v3" ON public.pacientes FOR UPDATE
  USING (clinica_id = (SELECT clinica_id FROM public.get_my_profile()))
  WITH CHECK (clinica_id = (SELECT clinica_id FROM public.get_my_profile()));

CREATE POLICY "pacientes_delete_v3" ON public.pacientes FOR DELETE
  USING (
    clinica_id = (SELECT clinica_id FROM public.get_my_profile())
    AND (SELECT role FROM public.get_my_profile()) = 'ADMIN'
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 10. RLS POLICIES — AGENDAMENTOS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP POLICY IF EXISTS "agendamentos_select_v3" ON public.agendamentos;
DROP POLICY IF EXISTS "agendamentos_insert_v3" ON public.agendamentos;
DROP POLICY IF EXISTS "agendamentos_update_v3" ON public.agendamentos;
DROP POLICY IF EXISTS "agendamentos_delete_v3" ON public.agendamentos;

CREATE POLICY "agendamentos_select_v3" ON public.agendamentos FOR SELECT
  USING (
    clinica_id = (SELECT clinica_id FROM public.get_my_profile())
    OR (SELECT is_master_admin FROM public.get_my_profile())
  );

CREATE POLICY "agendamentos_insert_v3" ON public.agendamentos FOR INSERT
  WITH CHECK (clinica_id = (SELECT clinica_id FROM public.get_my_profile()));

CREATE POLICY "agendamentos_update_v3" ON public.agendamentos FOR UPDATE
  USING (clinica_id = (SELECT clinica_id FROM public.get_my_profile()))
  WITH CHECK (clinica_id = (SELECT clinica_id FROM public.get_my_profile()));

CREATE POLICY "agendamentos_delete_v3" ON public.agendamentos FOR DELETE
  USING (clinica_id = (SELECT clinica_id FROM public.get_my_profile()));

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 11. RLS POLICIES — EVOLUCOES_CLINICAS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP POLICY IF EXISTS "evolucoes_select_v3" ON public.evolucoes_clinicas;
DROP POLICY IF EXISTS "evolucoes_insert_v3" ON public.evolucoes_clinicas;
DROP POLICY IF EXISTS "evolucoes_update_v3" ON public.evolucoes_clinicas;

CREATE POLICY "evolucoes_select_v3" ON public.evolucoes_clinicas FOR SELECT
  USING (
    clinica_id = (SELECT clinica_id FROM public.get_my_profile())
    OR (SELECT is_master_admin FROM public.get_my_profile())
  );

CREATE POLICY "evolucoes_insert_v3" ON public.evolucoes_clinicas FOR INSERT
  WITH CHECK (clinica_id = (SELECT clinica_id FROM public.get_my_profile()));

CREATE POLICY "evolucoes_update_v3" ON public.evolucoes_clinicas FOR UPDATE
  USING (clinica_id = (SELECT clinica_id FROM public.get_my_profile()))
  WITH CHECK (clinica_id = (SELECT clinica_id FROM public.get_my_profile()));

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 12. RLS POLICIES — ANAMNESES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP POLICY IF EXISTS "anamneses_select_v3" ON public.anamneses;
DROP POLICY IF EXISTS "anamneses_insert_v3" ON public.anamneses;
DROP POLICY IF EXISTS "anamneses_update_v3" ON public.anamneses;

CREATE POLICY "anamneses_select_v3" ON public.anamneses FOR SELECT
  USING (clinica_id = (SELECT clinica_id FROM public.get_my_profile()));

CREATE POLICY "anamneses_insert_v3" ON public.anamneses FOR INSERT
  WITH CHECK (clinica_id = (SELECT clinica_id FROM public.get_my_profile()));

CREATE POLICY "anamneses_update_v3" ON public.anamneses FOR UPDATE
  USING (clinica_id = (SELECT clinica_id FROM public.get_my_profile()));

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 13. LIBERAR CLÍNICA TESTE — PLANO TESTE_INTERNO COM TODOS OS RECURSOS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

UPDATE public.planos
SET
  recursos = jsonb_build_object(
    'gestao_financeira_completa', true,
    'dashboard_financeiro', true,
    'financeiro', true,
    'ia_consultora', true,
    'relatorios_avancados', true,
    'evolucoes_ia', true,
    'assinatura_digital', true,
    'laudos_pdf', true,
    'funcionarios_ilimitados', true,
    'pacientes_ilimitados', true,
    'agenda_completa', true,
    'relatorios', true,
    'equipe', true
  ),
  ativo = true,
  max_usuarios = 999999,
  max_pacientes = 999999,
  valor_mensal = 0,
  valor_ativacao = 0
WHERE nome = 'TESTE_INTERNO';

UPDATE public.clinicas
SET
  plano_id = (SELECT id FROM public.planos WHERE nome = 'TESTE_INTERNO' LIMIT 1),
  status = 'ACTIVE',
  assinatura_ativa = true,
  assinatura_vencimento = (now() + interval '10 years')::date,
  is_active = true
WHERE email = 'clinica.teste@clinixpower.com.br';

UPDATE public.profiles
SET
  is_active = true,
  role = 'ADMIN'
WHERE clinica_id = (
  SELECT id FROM public.clinicas WHERE email = 'clinica.teste@clinixpower.com.br' LIMIT 1
)
AND role = 'ADMIN';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 14. VERIFICAÇÃO FINAL
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  c.nome_fantasia,
  c.email,
  c.status,
  c.assinatura_ativa,
  p.nome AS plano_nome,
  p.recursos AS plano_recursos
FROM public.clinicas c
LEFT JOIN public.planos p ON c.plano_id = p.id
WHERE c.email = 'clinica.teste@clinixpower.com.br';
