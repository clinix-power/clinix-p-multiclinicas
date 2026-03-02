-- ============================================================
-- CLINIX POWER — SCRIPT IDEMPOTENTE COMPLETO
-- Versão: 2026-03-01
-- Missões: 1A, 1C, 2, 3A, 4
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- MISSÃO 1A — TABELA convenios
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.convenios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id    uuid NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome          text NOT NULL,
  valor_sessao  numeric(10,2) NOT NULL DEFAULT 0,
  cor           text NOT NULL DEFAULT '#a855f7',
  ativo         boolean NOT NULL DEFAULT true,
  is_padrao     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_convenios_clinica_id ON public.convenios(clinica_id);
CREATE INDEX IF NOT EXISTS idx_convenios_clinica_ativo ON public.convenios(clinica_id, ativo);

-- RLS
ALTER TABLE public.convenios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "convenios_select_own" ON public.convenios;
CREATE POLICY "convenios_select_own" ON public.convenios
  FOR SELECT USING (
    clinica_id = (
      SELECT clinica_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "convenios_insert_own" ON public.convenios;
CREATE POLICY "convenios_insert_own" ON public.convenios
  FOR INSERT WITH CHECK (
    clinica_id = (
      SELECT clinica_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "convenios_update_own" ON public.convenios;
CREATE POLICY "convenios_update_own" ON public.convenios
  FOR UPDATE USING (
    clinica_id = (
      SELECT clinica_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "convenios_delete_own" ON public.convenios;
CREATE POLICY "convenios_delete_own" ON public.convenios
  FOR DELETE USING (
    clinica_id = (
      SELECT clinica_id FROM public.profiles WHERE id = auth.uid()
    )
    AND is_padrao = false
  );

-- Função de seed: insere convênios padrão para uma clínica
CREATE OR REPLACE FUNCTION public.seed_convenios_padrao(p_clinica_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.convenios (clinica_id, nome, valor_sessao, cor, ativo, is_padrao)
  SELECT p_clinica_id, nome, valor_sessao, cor, true, true
  FROM (VALUES
    ('Particular',   150.00, '#22c55e'),
    ('Unimed',       100.00, '#3b82f6'),
    ('Bradesco Saúde', 90.00, '#a855f7'),
    ('SulAmérica',    85.00, '#f97316'),
    ('IPSM',          80.00, '#06b6d4')
  ) AS defaults(nome, valor_sessao, cor)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.convenios c
    WHERE c.clinica_id = p_clinica_id AND c.nome = defaults.nome
  );
END;
$$;

-- Executa seed para todas as clínicas existentes que ainda não têm convênios
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.clinicas LOOP
    IF NOT EXISTS (SELECT 1 FROM public.convenios WHERE clinica_id = r.id) THEN
      PERFORM public.seed_convenios_padrao(r.id);
    END IF;
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- MISSÃO 1C — Colunas extras em pacientes
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS convenio_id           uuid REFERENCES public.convenios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valor_sessao_override numeric(10,2);

CREATE INDEX IF NOT EXISTS idx_pacientes_convenio_id ON public.pacientes(convenio_id);

-- ─────────────────────────────────────────────────────────────
-- MISSÃO 2 — TABELA lancamentos_financeiros
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lancamentos_financeiros (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id        uuid NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  tipo              text NOT NULL CHECK (tipo IN ('RECEITA', 'DESPESA')),
  categoria         text NOT NULL,
  descricao         text,
  valor             numeric(12,2) NOT NULL CHECK (valor > 0),
  data_lancamento   date NOT NULL,
  status            text NOT NULL DEFAULT 'CONFIRMADO' CHECK (status IN ('CONFIRMADO', 'PENDENTE', 'CANCELADO')),
  paciente_id       uuid REFERENCES public.pacientes(id) ON DELETE SET NULL,
  convenio_id       uuid REFERENCES public.convenios(id) ON DELETE SET NULL,
  agendamento_id    uuid,
  observacoes       text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lancamentos_clinica_id ON public.lancamentos_financeiros(clinica_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON public.lancamentos_financeiros(clinica_id, data_lancamento);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo ON public.lancamentos_financeiros(clinica_id, tipo, status);

-- RLS
ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lancamentos_select_own" ON public.lancamentos_financeiros;
CREATE POLICY "lancamentos_select_own" ON public.lancamentos_financeiros
  FOR SELECT USING (
    clinica_id = (
      SELECT clinica_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "lancamentos_insert_own" ON public.lancamentos_financeiros;
CREATE POLICY "lancamentos_insert_own" ON public.lancamentos_financeiros
  FOR INSERT WITH CHECK (
    clinica_id = (
      SELECT clinica_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "lancamentos_update_own" ON public.lancamentos_financeiros;
CREATE POLICY "lancamentos_update_own" ON public.lancamentos_financeiros
  FOR UPDATE USING (
    clinica_id = (
      SELECT clinica_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "lancamentos_delete_own" ON public.lancamentos_financeiros;
CREATE POLICY "lancamentos_delete_own" ON public.lancamentos_financeiros
  FOR DELETE USING (
    clinica_id = (
      SELECT clinica_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- MISSÃO 3A — TABELA consultora_insights
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.consultora_insights (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id  uuid NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  titulo      text NOT NULL,
  descricao   text NOT NULL,
  prioridade  text NOT NULL DEFAULT 'MEDIA' CHECK (prioridade IN ('ALTA', 'MEDIA', 'BAIXA')),
  tipo        text NOT NULL DEFAULT 'ESTRATEGICO' CHECK (tipo IN ('FINANCEIRO', 'OPERACIONAL', 'ESTRATEGICO')),
  lido        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultora_clinica_id ON public.consultora_insights(clinica_id);
CREATE INDEX IF NOT EXISTS idx_consultora_lido ON public.consultora_insights(clinica_id, lido);
CREATE INDEX IF NOT EXISTS idx_consultora_created ON public.consultora_insights(clinica_id, created_at DESC);

-- RLS
ALTER TABLE public.consultora_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consultora_select_own" ON public.consultora_insights;
CREATE POLICY "consultora_select_own" ON public.consultora_insights
  FOR SELECT USING (
    clinica_id = (
      SELECT clinica_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "consultora_insert_own" ON public.consultora_insights;
CREATE POLICY "consultora_insert_own" ON public.consultora_insights
  FOR INSERT WITH CHECK (
    clinica_id = (
      SELECT clinica_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "consultora_update_own" ON public.consultora_insights;
CREATE POLICY "consultora_update_own" ON public.consultora_insights
  FOR UPDATE USING (
    clinica_id = (
      SELECT clinica_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "consultora_delete_own" ON public.consultora_insights;
CREATE POLICY "consultora_delete_own" ON public.consultora_insights
  FOR DELETE USING (
    clinica_id = (
      SELECT clinica_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Política especial: service_role pode inserir (para o cron/API route)
DROP POLICY IF EXISTS "consultora_service_role_insert" ON public.consultora_insights;
CREATE POLICY "consultora_service_role_insert" ON public.consultora_insights
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Igual para lancamentos_financeiros (service_role)
DROP POLICY IF EXISTS "lancamentos_service_role_insert" ON public.lancamentos_financeiros;
CREATE POLICY "lancamentos_service_role_insert" ON public.lancamentos_financeiros
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- MISSÃO 4 — UPDATE planos: recursos ia_consultora
-- ─────────────────────────────────────────────────────────────

-- Adiciona ia_consultora: true para planos ULTIMATE e TESTE_INTERNO
UPDATE public.planos
SET recursos = recursos || '{"ia_consultora": true}'::jsonb
WHERE nome IN ('ULTIMATE', 'TESTE_INTERNO')
  AND (recursos ->> 'ia_consultora') IS DISTINCT FROM 'true';

-- Adiciona gestao_financeira_completa: true para PRO, ULTIMATE, TESTE_INTERNO
UPDATE public.planos
SET recursos = recursos || '{"gestao_financeira_completa": true}'::jsonb
WHERE nome IN ('PRO', 'ULTIMATE', 'TESTE_INTERNO')
  AND (recursos ->> 'gestao_financeira_completa') IS DISTINCT FROM 'true';

-- ─────────────────────────────────────────────────────────────
-- TRIGGER: seed automático de convênios ao criar nova clínica
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_seed_convenios_nova_clinica()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.seed_convenios_padrao(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_seed_convenios ON public.clinicas;
CREATE TRIGGER trig_seed_convenios
  AFTER INSERT ON public.clinicas
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_seed_convenios_nova_clinica();

-- ─────────────────────────────────────────────────────────────
-- FIM DO SCRIPT
-- ─────────────────────────────────────────────────────────────
