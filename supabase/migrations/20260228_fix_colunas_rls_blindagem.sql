-- ============================================================
-- MIGRATION: Correção de colunas faltantes + Blindagem RLS
-- Data: 2026-02-28
-- Descrição: Adiciona colunas ausentes que causavam erros críticos,
--            cria get_my_profile() para evitar recursão RLS,
--            e garante isolamento multiclínica em todas as tabelas.
-- SEGURO: Usa IF NOT EXISTS e DROP POLICY IF EXISTS em tudo.
-- ============================================================

-- ============================================================
-- PARTE 1: COLUNAS FALTANTES
-- ============================================================

-- 1a. Adicionar cpf à tabela pacientes (causava ERRO 1 e ERRO 4)
ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS cpf text;

-- 1b. Adicionar colunas de perfil profissional em profiles
--     (causavam ERRO 5 e erros em evoluções/laudos)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profissao text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registro_tipo text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registro_numero text;

-- 1c. Adicionar colunas de evolução clínica (texto_original e texto_melhorado_ia)
ALTER TABLE public.evolucoes_clinicas
  ADD COLUMN IF NOT EXISTS texto_original text;

ALTER TABLE public.evolucoes_clinicas
  ADD COLUMN IF NOT EXISTS texto_melhorado_ia text;

-- Migrar dados existentes: copiar coluna 'texto' para 'texto_original'
UPDATE public.evolucoes_clinicas
SET texto_original = texto
WHERE texto_original IS NULL AND texto IS NOT NULL;

-- ============================================================
-- PARTE 2: FUNÇÃO get_my_profile() — EVITA RECURSÃO RLS
-- ============================================================
-- Esta função usa SECURITY DEFINER para ler o profile do
-- usuário autenticado sem acionar as políticas RLS da tabela
-- profiles, quebrando o ciclo de recursão infinita.

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

-- ============================================================
-- PARTE 3: HABILITAR RLS EM TODAS AS TABELAS DE DADOS
-- ============================================================

ALTER TABLE public.pacientes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamneses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolucoes_clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PARTE 4: POLÍTICAS RLS — profiles
-- ============================================================

-- Usuário lê seu próprio perfil ou perfis da sua clínica
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

-- Usuário atualiza apenas seu próprio perfil
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin pode inserir novos profiles na mesma clínica
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
CREATE POLICY "profiles_insert_admin"
  ON public.profiles FOR INSERT
  WITH CHECK (
    (SELECT is_master_admin FROM public.get_my_profile())
    OR (
      (SELECT role FROM public.get_my_profile()) = 'ADMIN'
      AND clinica_id = (SELECT clinica_id FROM public.get_my_profile())
    )
  );

-- ============================================================
-- PARTE 5: POLÍTICAS RLS — pacientes
-- ============================================================

DROP POLICY IF EXISTS "pacientes_select_clinica" ON public.pacientes;
CREATE POLICY "pacientes_select_clinica"
  ON public.pacientes FOR SELECT
  USING (
    (SELECT is_master_admin FROM public.get_my_profile())
    OR clinica_id = (SELECT clinica_id FROM public.get_my_profile())
  );

DROP POLICY IF EXISTS "pacientes_insert_clinica" ON public.pacientes;
CREATE POLICY "pacientes_insert_clinica"
  ON public.pacientes FOR INSERT
  WITH CHECK (
    clinica_id = (SELECT clinica_id FROM public.get_my_profile())
  );

DROP POLICY IF EXISTS "pacientes_update_clinica" ON public.pacientes;
CREATE POLICY "pacientes_update_clinica"
  ON public.pacientes FOR UPDATE
  USING (clinica_id = (SELECT clinica_id FROM public.get_my_profile()))
  WITH CHECK (clinica_id = (SELECT clinica_id FROM public.get_my_profile()));

DROP POLICY IF EXISTS "pacientes_delete_admin" ON public.pacientes;
CREATE POLICY "pacientes_delete_admin"
  ON public.pacientes FOR DELETE
  USING (
    clinica_id = (SELECT clinica_id FROM public.get_my_profile())
    AND (SELECT role FROM public.get_my_profile()) = 'ADMIN'
  );

-- ============================================================
-- PARTE 6: POLÍTICAS RLS — agendamentos
-- ============================================================

DROP POLICY IF EXISTS "agendamentos_select_clinica" ON public.agendamentos;
CREATE POLICY "agendamentos_select_clinica"
  ON public.agendamentos FOR SELECT
  USING (
    (SELECT is_master_admin FROM public.get_my_profile())
    OR clinica_id = (SELECT clinica_id FROM public.get_my_profile())
  );

DROP POLICY IF EXISTS "agendamentos_insert_clinica" ON public.agendamentos;
CREATE POLICY "agendamentos_insert_clinica"
  ON public.agendamentos FOR INSERT
  WITH CHECK (
    clinica_id = (SELECT clinica_id FROM public.get_my_profile())
  );

DROP POLICY IF EXISTS "agendamentos_update_clinica" ON public.agendamentos;
CREATE POLICY "agendamentos_update_clinica"
  ON public.agendamentos FOR UPDATE
  USING (clinica_id = (SELECT clinica_id FROM public.get_my_profile()))
  WITH CHECK (clinica_id = (SELECT clinica_id FROM public.get_my_profile()));

DROP POLICY IF EXISTS "agendamentos_delete_admin" ON public.agendamentos;
CREATE POLICY "agendamentos_delete_admin"
  ON public.agendamentos FOR DELETE
  USING (
    clinica_id = (SELECT clinica_id FROM public.get_my_profile())
    AND (SELECT role FROM public.get_my_profile()) = 'ADMIN'
  );

-- ============================================================
-- PARTE 7: POLÍTICAS RLS — evolucoes_clinicas
-- ============================================================

DROP POLICY IF EXISTS "evolucoes_select_clinica" ON public.evolucoes_clinicas;
CREATE POLICY "evolucoes_select_clinica"
  ON public.evolucoes_clinicas FOR SELECT
  USING (
    (SELECT is_master_admin FROM public.get_my_profile())
    OR clinica_id = (SELECT clinica_id FROM public.get_my_profile())
  );

DROP POLICY IF EXISTS "evolucoes_insert_clinica" ON public.evolucoes_clinicas;
CREATE POLICY "evolucoes_insert_clinica"
  ON public.evolucoes_clinicas FOR INSERT
  WITH CHECK (
    clinica_id = (SELECT clinica_id FROM public.get_my_profile())
  );

DROP POLICY IF EXISTS "evolucoes_update_own" ON public.evolucoes_clinicas;
CREATE POLICY "evolucoes_update_own"
  ON public.evolucoes_clinicas FOR UPDATE
  USING (
    profissional_id = auth.uid()
    AND clinica_id = (SELECT clinica_id FROM public.get_my_profile())
  );

DROP POLICY IF EXISTS "evolucoes_delete_admin" ON public.evolucoes_clinicas;
CREATE POLICY "evolucoes_delete_admin"
  ON public.evolucoes_clinicas FOR DELETE
  USING (
    clinica_id = (SELECT clinica_id FROM public.get_my_profile())
    AND (SELECT role FROM public.get_my_profile()) = 'ADMIN'
  );

-- ============================================================
-- PARTE 8: POLÍTICAS RLS — anamneses
-- ============================================================

DROP POLICY IF EXISTS "anamneses_select_clinica" ON public.anamneses;
CREATE POLICY "anamneses_select_clinica"
  ON public.anamneses FOR SELECT
  USING (
    (SELECT is_master_admin FROM public.get_my_profile())
    OR clinica_id = (SELECT clinica_id FROM public.get_my_profile())
  );

DROP POLICY IF EXISTS "anamneses_insert_clinica" ON public.anamneses;
CREATE POLICY "anamneses_insert_clinica"
  ON public.anamneses FOR INSERT
  WITH CHECK (
    clinica_id = (SELECT clinica_id FROM public.get_my_profile())
  );

DROP POLICY IF EXISTS "anamneses_update_own" ON public.anamneses;
CREATE POLICY "anamneses_update_own"
  ON public.anamneses FOR UPDATE
  USING (
    profissional_id = auth.uid()
    AND clinica_id = (SELECT clinica_id FROM public.get_my_profile())
  );

-- ============================================================
-- PARTE 9: POLÍTICAS RLS — clinicas (Master Admin only para escrita)
-- ============================================================

DROP POLICY IF EXISTS "clinicas_select_own" ON public.clinicas;
CREATE POLICY "clinicas_select_own"
  ON public.clinicas FOR SELECT
  USING (
    (SELECT is_master_admin FROM public.get_my_profile())
    OR id = (SELECT clinica_id FROM public.get_my_profile())
  );

DROP POLICY IF EXISTS "clinicas_insert_master" ON public.clinicas;
CREATE POLICY "clinicas_insert_master"
  ON public.clinicas FOR INSERT
  WITH CHECK (
    (SELECT is_master_admin FROM public.get_my_profile())
  );

DROP POLICY IF EXISTS "clinicas_update_master_or_admin" ON public.clinicas;
CREATE POLICY "clinicas_update_master_or_admin"
  ON public.clinicas FOR UPDATE
  USING (
    (SELECT is_master_admin FROM public.get_my_profile())
    OR (
      id = (SELECT clinica_id FROM public.get_my_profile())
      AND (SELECT role FROM public.get_my_profile()) = 'ADMIN'
    )
  );

-- ============================================================
-- PARTE 10: COLUNAS ADICIONAIS FALTANTES
-- ============================================================

ALTER TABLE public.clinicas
  ADD COLUMN IF NOT EXISTS whatsapp text;

-- Colunas extras do agendamento (podem não existir em DBs antigos)
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS paciente_id uuid REFERENCES public.pacientes(id) ON DELETE CASCADE;

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS profissional_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS tipo_servico text;

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS tipo_servico_outro text;

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS modalidade text;

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS motivo_recusa text;

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS motivo_cancelamento text;

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS motivo_remarcacao text;

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS updated_by_role text;

-- ============================================================
-- PARTE 11: RLS — configuracoes_clinica
-- ============================================================

ALTER TABLE public.configuracoes_clinica ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "config_select_clinica" ON public.configuracoes_clinica;
CREATE POLICY "config_select_clinica"
  ON public.configuracoes_clinica FOR SELECT
  USING (
    (SELECT is_master_admin FROM public.get_my_profile())
    OR clinica_id = (SELECT clinica_id FROM public.get_my_profile())
  );

DROP POLICY IF EXISTS "config_insert_clinica" ON public.configuracoes_clinica;
CREATE POLICY "config_insert_clinica"
  ON public.configuracoes_clinica FOR INSERT
  WITH CHECK (
    clinica_id = (SELECT clinica_id FROM public.get_my_profile())
  );

DROP POLICY IF EXISTS "config_update_clinica" ON public.configuracoes_clinica;
CREATE POLICY "config_update_clinica"
  ON public.configuracoes_clinica FOR UPDATE
  USING (clinica_id = (SELECT clinica_id FROM public.get_my_profile()))
  WITH CHECK (clinica_id = (SELECT clinica_id FROM public.get_my_profile()));

-- ============================================================
-- PARTE 12: RLS — pagamentos
-- ============================================================

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pagamentos_select_clinica" ON public.pagamentos;
CREATE POLICY "pagamentos_select_clinica"
  ON public.pagamentos FOR SELECT
  USING (
    (SELECT is_master_admin FROM public.get_my_profile())
    OR clinica_id = (SELECT clinica_id FROM public.get_my_profile())
  );

DROP POLICY IF EXISTS "pagamentos_insert_master" ON public.pagamentos;
CREATE POLICY "pagamentos_insert_master"
  ON public.pagamentos FOR INSERT
  WITH CHECK (
    (SELECT is_master_admin FROM public.get_my_profile())
  );

-- ============================================================
-- PARTE 13: CORRIGIR profiles SELECT — FUNCIONARIO vê colegas (nome, id)
-- ============================================================
-- A policy atual só permite ADMIN ver colegas. Funcionários precisam
-- ver nomes de profissionais da clínica (ex: agenda, evoluções).

DROP POLICY IF EXISTS "profiles_select_own_or_same_clinic" ON public.profiles;
CREATE POLICY "profiles_select_own_or_same_clinic"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR (SELECT is_master_admin FROM public.get_my_profile())
    OR (
      clinica_id IS NOT NULL
      AND clinica_id = (SELECT clinica_id FROM public.get_my_profile())
    )
  );

-- ============================================================
-- VERIFICAÇÃO FINAL (execute no SQL Editor para confirmar)
-- ============================================================
-- SELECT tablename, policyname, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
--
-- SELECT relname, relrowsecurity
-- FROM pg_class
-- WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
-- ORDER BY relname;
