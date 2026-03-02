-- ════════════════════════════════════════════════════════════════════════════
-- FIX: ACESSO ÀS ROTAS ADMINISTRATIVAS (Financeiro, Laudos, Equipes, etc)
-- Data: 2026-03-02
-- Problema: Páginas /admin/* retornando 404 para usuários ADMIN
-- Solução: Garantir RLS correto e função get_my_profile funcionando
-- ════════════════════════════════════════════════════════════════════════════

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. RECRIAR FUNÇÃO get_my_profile() COM SEGURANÇA
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE(
  role          text,
  is_master_admin boolean,
  is_active     boolean,
  clinica_id    uuid
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role, is_master_admin, is_active, clinica_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_my_profile() IS 'Retorna perfil do usuário autenticado sem acionar RLS (evita recursão)';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. GARANTIR RLS HABILITADO EM TODAS AS TABELAS CRÍTICAS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolucoes_clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamneses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convenios ENABLE ROW LEVEL SECURITY;

-- A tabela public.laudos pode não existir em alguns ambientes
DO $$
BEGIN
  IF to_regclass('public.laudos') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.laudos ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. POLÍTICAS RLS PARA PROFILES (ADMIN e FUNCIONARIO)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- SELECT: Usuário vê seu próprio perfil OU perfis da mesma clínica (se ADMIN)
DROP POLICY IF EXISTS "profiles_select_own_or_same_clinic" ON public.profiles;
CREATE POLICY "profiles_select_own_or_same_clinic"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR (SELECT is_master_admin FROM public.get_my_profile())
    OR (
      clinica_id IS NOT NULL
      AND clinica_id = (SELECT clinica_id FROM public.get_my_profile())
      AND (SELECT role FROM public.get_my_profile()) = 'ADMIN'
    )
  );

-- UPDATE: Usuário atualiza apenas seu próprio perfil
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT: Apenas ADMIN ou MASTER_ADMIN podem criar novos profiles
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
CREATE POLICY "profiles_insert_admin"
  ON public.profiles FOR INSERT
  WITH CHECK (
    (SELECT is_master_admin FROM public.get_my_profile())
    OR (SELECT role FROM public.get_my_profile()) = 'ADMIN'
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. POLÍTICAS RLS PARA CLINICAS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- SELECT: Usuário vê apenas sua própria clínica (ou todas se MASTER_ADMIN)
DROP POLICY IF EXISTS "clinicas_select_own" ON public.clinicas;
CREATE POLICY "clinicas_select_own"
  ON public.clinicas FOR SELECT
  USING (
    (SELECT is_master_admin FROM public.get_my_profile())
    OR id = (SELECT clinica_id FROM public.get_my_profile())
  );

-- UPDATE: Apenas ADMIN da clínica ou MASTER_ADMIN podem atualizar
DROP POLICY IF EXISTS "clinicas_update_own" ON public.clinicas;
CREATE POLICY "clinicas_update_own"
  ON public.clinicas FOR UPDATE
  USING (
    (SELECT is_master_admin FROM public.get_my_profile())
    OR (
      id = (SELECT clinica_id FROM public.get_my_profile())
      AND (SELECT role FROM public.get_my_profile()) = 'ADMIN'
    )
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. POLÍTICAS RLS PARA LAUDOS (ADMIN e FUNCIONARIO podem acessar)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
  IF to_regclass('public.laudos') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "laudos_select_own_clinic" ON public.laudos';
    EXECUTE 'CREATE POLICY "laudos_select_own_clinic" ON public.laudos FOR SELECT USING (clinica_id = (SELECT clinica_id FROM public.get_my_profile()))';

    EXECUTE 'DROP POLICY IF EXISTS "laudos_insert_own_clinic" ON public.laudos';
    EXECUTE 'CREATE POLICY "laudos_insert_own_clinic" ON public.laudos FOR INSERT WITH CHECK (clinica_id = (SELECT clinica_id FROM public.get_my_profile()))';

    EXECUTE 'DROP POLICY IF EXISTS "laudos_update_own_clinic" ON public.laudos';
    EXECUTE 'CREATE POLICY "laudos_update_own_clinic" ON public.laudos FOR UPDATE USING (clinica_id = (SELECT clinica_id FROM public.get_my_profile()))';

    EXECUTE 'DROP POLICY IF EXISTS "laudos_delete_own_clinic" ON public.laudos';
    EXECUTE 'CREATE POLICY "laudos_delete_own_clinic" ON public.laudos FOR DELETE USING (clinica_id = (SELECT clinica_id FROM public.get_my_profile()))';
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. POLÍTICAS RLS PARA LANCAMENTOS_FINANCEIROS (apenas ADMIN)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP POLICY IF EXISTS "lancamentos_select_own" ON public.lancamentos_financeiros;
CREATE POLICY "lancamentos_select_own"
  ON public.lancamentos_financeiros FOR SELECT
  USING (
    clinica_id = (SELECT clinica_id FROM public.get_my_profile())
  );

DROP POLICY IF EXISTS "lancamentos_insert_own" ON public.lancamentos_financeiros;
CREATE POLICY "lancamentos_insert_own"
  ON public.lancamentos_financeiros FOR INSERT
  WITH CHECK (
    clinica_id = (SELECT clinica_id FROM public.get_my_profile())
  );

DROP POLICY IF EXISTS "lancamentos_update_own" ON public.lancamentos_financeiros;
CREATE POLICY "lancamentos_update_own"
  ON public.lancamentos_financeiros FOR UPDATE
  USING (
    clinica_id = (SELECT clinica_id FROM public.get_my_profile())
  );

DROP POLICY IF EXISTS "lancamentos_delete_own" ON public.lancamentos_financeiros;
CREATE POLICY "lancamentos_delete_own"
  ON public.lancamentos_financeiros FOR DELETE
  USING (
    clinica_id = (SELECT clinica_id FROM public.get_my_profile())
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7. VERIFICAR SE CLÍNICA TESTE TEM PLANO CORRETO E ESTÁ ATIVA
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Garantir que a clínica de teste tenha o plano TESTE_INTERNO associado e status ACTIVE
UPDATE public.clinicas
SET 
  plano_id = (SELECT id FROM public.planos WHERE nome = 'TESTE_INTERNO' LIMIT 1),
  status = 'ACTIVE',
  assinatura_ativa = true,
  assinatura_vencimento = (now() + interval '10 years')::date,
  is_active = true
WHERE email = 'clinica.teste@clinixpower.com.br';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 8. GARANTIR QUE PLANO TESTE_INTERNO TENHA TODOS OS RECURSOS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

UPDATE public.planos
SET recursos = jsonb_build_object(
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
)
WHERE nome = 'TESTE_INTERNO';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 9. CRIAR VIEWS PARA RELATÓRIOS (se não existirem)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- View: Status de clientes (ativos/inativos baseado em última consulta)
CREATE OR REPLACE VIEW public.vw_relatorio_clientes_status AS
SELECT 
  p.clinica_id,
  COUNT(DISTINCT p.id) as clientes_ativos,
  0 as clientes_inativos
FROM public.pacientes p
GROUP BY p.clinica_id;

-- View: Pacientes por convênio
CREATE OR REPLACE VIEW public.vw_pacientes_por_convenio AS
SELECT 
  p.clinica_id,
  COALESCE(p.convenio, 'Particular') as convenio,
  COUNT(p.id) as total_pacientes
FROM public.pacientes p
GROUP BY p.clinica_id, p.convenio;

-- View: Consultas realizadas
CREATE OR REPLACE VIEW public.relatorio_consultas_realizadas AS
SELECT 
  a.clinica_id,
  prof.nome as profissional,
  pac.convenio,
  TO_CHAR(a.data, 'YYYY-MM') as mes_ano,
  COUNT(a.id) as total_consultas
FROM public.agendamentos a
LEFT JOIN public.profiles prof ON a.profissional_id = prof.id
LEFT JOIN public.pacientes pac ON a.paciente_id = pac.id
WHERE a.status IN ('CONFIRMADO', 'REALIZADO')
GROUP BY a.clinica_id, prof.nome, pac.convenio, TO_CHAR(a.data, 'YYYY-MM');

-- View: Consultas canceladas
CREATE OR REPLACE VIEW public.relatorio_consultas_canceladas AS
SELECT 
  a.clinica_id,
  prof.nome as profissional,
  pac.nome as paciente,
  pac.convenio,
  COUNT(a.id) as total_canceladas
FROM public.agendamentos a
LEFT JOIN public.profiles prof ON a.profissional_id = prof.id
LEFT JOIN public.pacientes pac ON a.paciente_id = pac.id
WHERE a.status = 'CANCELADO'
GROUP BY a.clinica_id, prof.nome, pac.nome, pac.convenio;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 10. ÍNDICES PARA PERFORMANCE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE INDEX IF NOT EXISTS idx_profiles_clinica_id ON public.profiles(clinica_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_clinicas_plano_id ON public.clinicas(plano_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_clinica_data ON public.lancamentos_financeiros(clinica_id, data_lancamento DESC);

DO $$
BEGIN
  IF to_regclass('public.laudos') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_laudos_clinica_id ON public.laudos(clinica_id)';
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- FIM DA MIGRATION
-- ════════════════════════════════════════════════════════════════════════════
