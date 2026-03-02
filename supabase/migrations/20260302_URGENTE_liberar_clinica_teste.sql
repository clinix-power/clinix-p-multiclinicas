-- ════════════════════════════════════════════════════════════════════════════
-- URGENTE: LIBERAR ACESSO TOTAL PARA CLÍNICA TESTE
-- Email: clinica.teste@clinixpower.com.br
-- Objetivo: Garantir acesso a Financeiro, Minha Assinatura e todas as features
-- ════════════════════════════════════════════════════════════════════════════

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. GARANTIR QUE PLANO TESTE_INTERNO TEM TODOS OS RECURSOS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Atualizar plano TESTE_INTERNO com todos os recursos
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

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. ASSOCIAR PLANO TESTE_INTERNO À CLÍNICA TESTE E ATIVAR TUDO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

UPDATE public.clinicas
SET 
  plano_id = (SELECT id FROM public.planos WHERE nome = 'TESTE_INTERNO' LIMIT 1),
  status = 'ACTIVE',
  assinatura_ativa = true,
  assinatura_vencimento = (now() + interval '10 years')::date,
  data_expiracao_trial = NULL,
  is_active = true
WHERE email = 'clinica.teste@clinixpower.com.br';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. GARANTIR QUE ADMIN DA CLÍNICA TESTE ESTÁ ATIVO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

UPDATE public.profiles
SET 
  is_active = true,
  role = 'ADMIN'
WHERE clinica_id = (SELECT id FROM public.clinicas WHERE email = 'clinica.teste@clinixpower.com.br' LIMIT 1);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. VERIFICAÇÃO: MOSTRAR STATUS DA CLÍNICA TESTE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT 
  c.id as clinica_id,
  c.nome_fantasia,
  c.email,
  c.status,
  c.assinatura_ativa,
  c.assinatura_vencimento,
  c.is_active,
  p.nome as plano_nome,
  p.recursos as plano_recursos
FROM public.clinicas c
LEFT JOIN public.planos p ON c.plano_id = p.id
WHERE c.email = 'clinica.teste@clinixpower.com.br';

-- ════════════════════════════════════════════════════════════════════════════
-- FIM - CLÍNICA TESTE AGORA TEM ACESSO TOTAL
-- ════════════════════════════════════════════════════════════════════════════
