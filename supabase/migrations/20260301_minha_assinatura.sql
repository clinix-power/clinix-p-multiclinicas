-- ════════════════════════════════════════════════════════════════════════════
-- MISSÃO: MINHA ASSINATURA - A CEREJA DO BOLO
-- Página de gestão de assinatura com design futurístico premium
-- ════════════════════════════════════════════════════════════════════════════

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. TABELA: alertas_renovacao
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.alertas_renovacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  tipo text DEFAULT 'RENOVACAO' CHECK (tipo IN ('RENOVACAO','TRIAL','UPGRADE')),
  dias_restantes integer,
  lido boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.alertas_renovacao IS 'Alertas de renovação de assinatura exibidos no balão flutuante';
COMMENT ON COLUMN public.alertas_renovacao.tipo IS 'RENOVACAO: assinatura vencendo | TRIAL: período de teste terminando | UPGRADE: sugestão de upgrade';
COMMENT ON COLUMN public.alertas_renovacao.dias_restantes IS 'Quantos dias faltam para vencimento';
COMMENT ON COLUMN public.alertas_renovacao.lido IS 'Se o alerta já foi visualizado/dispensado pelo usuário';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. RLS: alertas_renovacao
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.alertas_renovacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alertas_select" ON public.alertas_renovacao;
DROP POLICY IF EXISTS "alertas_insert" ON public.alertas_renovacao;
DROP POLICY IF EXISTS "alertas_update" ON public.alertas_renovacao;

CREATE POLICY "alertas_select" ON public.alertas_renovacao FOR SELECT
USING (clinica_id = (SELECT clinica_id FROM public.get_my_profile()));

CREATE POLICY "alertas_insert" ON public.alertas_renovacao FOR INSERT
WITH CHECK (true);

CREATE POLICY "alertas_update" ON public.alertas_renovacao FOR UPDATE
USING (clinica_id = (SELECT clinica_id FROM public.get_my_profile()));

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. FUNÇÃO: verificar_alertas_renovacao()
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.verificar_alertas_renovacao()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE 
  r RECORD;
  dias integer;
BEGIN
  -- Percorrer todas as clínicas ativas ou em trial
  FOR r IN
    SELECT id, assinatura_vencimento, data_expiracao_trial, status
    FROM public.clinicas
    WHERE status IN ('ACTIVE','TRIAL') AND is_active = true
  LOOP
    -- Calcular dias restantes
    IF r.status = 'TRIAL' THEN
      dias := EXTRACT(DAY FROM (r.data_expiracao_trial - now()))::integer;
    ELSE
      dias := EXTRACT(DAY FROM (r.assinatura_vencimento - now()))::integer;
    END IF;

    -- Criar alerta se vence em 7, 3 ou 1 dia e ainda não existe alerta não lido recente
    IF dias IN (7, 3, 1) THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.alertas_renovacao
        WHERE clinica_id = r.id 
          AND lido = false
          AND created_at > now() - interval '24 hours'
      ) THEN
        INSERT INTO public.alertas_renovacao (clinica_id, tipo, dias_restantes)
        VALUES (
          r.id, 
          CASE WHEN r.status = 'TRIAL' THEN 'TRIAL' ELSE 'RENOVACAO' END, 
          dias
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.verificar_alertas_renovacao() IS 'Verifica vencimentos e cria alertas automaticamente para 7, 3 e 1 dia antes';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. ÍNDICES para performance
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE INDEX IF NOT EXISTS idx_alertas_renovacao_clinica_lido 
ON public.alertas_renovacao(clinica_id, lido);

CREATE INDEX IF NOT EXISTS idx_alertas_renovacao_created 
ON public.alertas_renovacao(created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- FIM DA MIGRATION
-- ════════════════════════════════════════════════════════════════════════════
