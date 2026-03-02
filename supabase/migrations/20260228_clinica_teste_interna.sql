-- ════════════════════════════════════════════════════════════════════════════
-- CLINIX POWER - CLÍNICA TESTE INTERNA (PLANO GRATUITO ETERNO)
-- ════════════════════════════════════════════════════════════════════════════
-- Data: 2026-02-28
-- Objetivo: Criar plano TESTE_INTERNO exclusivo + clínica de demonstração
-- ATENÇÃO: Este plano é ÚNICO e EXCLUSIVO para a clínica teste.
--          NÃO criar lógica de plano gratuito para outras clínicas.
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- PASSO 1: Criar plano TESTE_INTERNO (gratuito eterno, não aparece na landing)
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO public.planos (
  nome, 
  descricao, 
  valor_mensal, 
  valor_ativacao,
  dias_teste, 
  max_usuarios, 
  max_pacientes, 
  recursos, 
  ativo
) VALUES (
  'TESTE_INTERNO',
  'Plano interno exclusivo para clínica de demonstração — NÃO exibir na landing page',
  0.00,
  0.00,
  36500, -- 100 anos
  99,
  99999,
  '{
    "evolucoes_ia": true, 
    "assinatura_digital": true, 
    "laudos_pdf_crefito": true, 
    "relatorios_pdf": true, 
    "fim_papelada": true, 
    "modo_admin": true, 
    "modo_funcionario": true, 
    "gestao_financeira_completa": true, 
    "plano_interno": true
  }'::jsonb,
  false -- ativo = false para NÃO aparecer na landing page
)
ON CONFLICT (nome) DO UPDATE SET
  valor_mensal = 0.00,
  valor_ativacao = 0.00,
  dias_teste = 36500,
  max_usuarios = 99,
  max_pacientes = 99999,
  ativo = false,
  descricao = 'Plano interno exclusivo para clínica de demonstração — NÃO exibir na landing page',
  recursos = '{
    "evolucoes_ia": true, 
    "assinatura_digital": true, 
    "laudos_pdf_crefito": true, 
    "relatorios_pdf": true, 
    "fim_papelada": true, 
    "modo_admin": true, 
    "modo_funcionario": true, 
    "gestao_financeira_completa": true, 
    "plano_interno": true
  }'::jsonb;

-- ────────────────────────────────────────────────────────────────────────────
-- PASSO 2: Criar a clínica teste
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO public.clinicas (
  nome_fantasia,
  razao_social,
  cnpj,
  email,
  telefone,
  whatsapp,
  cidade,
  estado,
  responsavel_nome,
  responsavel_email,
  responsavel_telefone,
  plano_id,
  status,
  pagamento_ativacao_confirmado,
  pagamento_ativacao_data,
  assinatura_ativa,
  assinatura_vencimento,
  data_ativacao,
  data_expiracao_trial,
  is_active
)
SELECT
  'Clinix Clínica Teste',
  'Clinix Power Demonstrações LTDA',
  '00000000000100', -- CNPJ sem formatação
  'clinica.teste@clinixpower.com.br',
  '31999990000',
  '31999990000',
  'Belo Horizonte',
  'MG',
  'Stefhone — Master Admin',
  'stefhonep@gmail.com',
  '31999990000',
  p.id,
  'ACTIVE',
  true,
  now(),
  true,
  (current_date + interval '100 years')::date,
  now(),
  (now() + interval '100 years'),
  true
FROM public.planos p
WHERE p.nome = 'TESTE_INTERNO'
ON CONFLICT (email) DO UPDATE SET
  status = 'ACTIVE',
  assinatura_ativa = true,
  assinatura_vencimento = (current_date + interval '100 years')::date,
  data_expiracao_trial = (now() + interval '100 years'),
  data_ativacao = COALESCE(clinicas.data_ativacao, now()),
  pagamento_ativacao_confirmado = true,
  pagamento_ativacao_data = COALESCE(clinicas.pagamento_ativacao_data, now()),
  is_active = true,
  plano_id = (SELECT id FROM public.planos WHERE nome = 'TESTE_INTERNO');

-- ────────────────────────────────────────────────────────────────────────────
-- PASSO 3: Criar profile do admin da clínica teste
-- ────────────────────────────────────────────────────────────────────────────
-- IMPORTANTE: Execute SOMENTE APÓS criar o usuário manualmente no Supabase Auth
-- Authentication > Users > Add User:
-- - Email: clinica.teste@clinixpower.com.br
-- - Senha: senha@#29
-- - Email Confirmed: SIM
-- ────────────────────────────────────────────────────────────────────────────

-- Criar profile vinculado à clínica teste (só funciona se o usuário existir)
INSERT INTO public.profiles (id, email, nome, role, clinica_id, is_master_admin, is_active)
SELECT
  au.id,
  'clinica.teste@clinixpower.com.br',
  'Admin Teste — Clinix Power',
  'ADMIN',
  c.id,
  false,
  true
FROM auth.users au, public.clinicas c
WHERE au.email = 'clinica.teste@clinixpower.com.br'
  AND c.email = 'clinica.teste@clinixpower.com.br'
ON CONFLICT (id) DO UPDATE SET
  clinica_id = (SELECT id FROM public.clinicas WHERE email = 'clinica.teste@clinixpower.com.br'),
  is_active = true,
  role = 'ADMIN',
  is_master_admin = false,
  nome = 'Admin Teste — Clinix Power';

-- ────────────────────────────────────────────────────────────────────────────
-- PASSO 4: Adicionar pacientes fictícios para demonstração
-- ────────────────────────────────────────────────────────────────────────────

-- Inserir 5 pacientes fictícios na clínica teste
INSERT INTO public.pacientes (nome, telefone, data_nascimento, clinica_id)
SELECT dados.nome, dados.telefone, dados.data_nascimento, c.id
FROM public.clinicas c,
(VALUES
  ('Maria Silva Santos', '31987654321', '1985-03-15'::date),
  ('João Pedro Oliveira', '31976543210', '1972-07-22'::date),
  ('Ana Paula Costa', '31965432109', '1990-11-08'::date),
  ('Carlos Eduardo Mendes', '31954321098', '1968-05-30'::date),
  ('Juliana Ferreira Lima', '31943210987', '1995-01-17'::date)
) AS dados(nome, telefone, data_nascimento)
WHERE c.email = 'clinica.teste@clinixpower.com.br'
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO FINAL
-- ────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_plano_id uuid;
  v_clinica_id uuid;
  v_user_id uuid;
  v_profile_exists boolean;
  v_pacientes_count integer;
BEGIN
  -- Verificar plano TESTE_INTERNO
  SELECT id INTO v_plano_id FROM public.planos WHERE nome = 'TESTE_INTERNO';
  
  IF v_plano_id IS NULL THEN
    RAISE NOTICE '❌ ERRO: Plano TESTE_INTERNO não foi criado';
  ELSE
    RAISE NOTICE '✅ Plano TESTE_INTERNO criado: %', v_plano_id;
  END IF;

  -- Verificar clínica teste
  SELECT id INTO v_clinica_id FROM public.clinicas WHERE email = 'clinica.teste@clinixpower.com.br';
  
  IF v_clinica_id IS NULL THEN
    RAISE NOTICE '❌ ERRO: Clínica teste não foi criada';
  ELSE
    RAISE NOTICE '✅ Clínica teste criada: %', v_clinica_id;
  END IF;

  -- Verificar usuário Auth
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'clinica.teste@clinixpower.com.br';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '⚠️  ATENÇÃO: Usuário clinica.teste@clinixpower.com.br NÃO encontrado em auth.users';
    RAISE NOTICE '   Crie o usuário manualmente no painel do Supabase:';
    RAISE NOTICE '   Authentication > Users > Add User';
    RAISE NOTICE '   Email: clinica.teste@clinixpower.com.br';
    RAISE NOTICE '   Senha: senha@#29';
    RAISE NOTICE '   Email Confirmed: SIM';
  ELSE
    RAISE NOTICE '✅ Usuário Auth encontrado: %', v_user_id;
    
    -- Verificar profile
    SELECT EXISTS(
      SELECT 1 FROM public.profiles 
      WHERE id = v_user_id 
        AND clinica_id = v_clinica_id
    ) INTO v_profile_exists;
    
    IF v_profile_exists THEN
      RAISE NOTICE '✅ Profile criado e vinculado à clínica teste';
    ELSE
      RAISE NOTICE '⚠️  Profile não foi criado (usuário pode não existir ainda)';
    END IF;
  END IF;

  -- Verificar pacientes
  SELECT COUNT(*) INTO v_pacientes_count 
  FROM public.pacientes 
  WHERE clinica_id = v_clinica_id;
  
  RAISE NOTICE '✅ Pacientes fictícios criados: %', v_pacientes_count;

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 MIGRAÇÃO CONCLUÍDA!';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRÓXIMOS PASSOS:';
  RAISE NOTICE '';
  IF v_user_id IS NULL THEN
    RAISE NOTICE '1. Criar usuário no Supabase Auth (veja instruções acima)';
    RAISE NOTICE '2. Executar esta migração novamente para criar o profile';
    RAISE NOTICE '3. Fazer login com: clinica.teste@clinixpower.com.br / senha@#29';
  ELSE
    RAISE NOTICE '1. Fazer login com: clinica.teste@clinixpower.com.br / senha@#29';
    RAISE NOTICE '2. Verificar que a clínica tem badge 🧪 TESTE no Master Admin';
  END IF;
  RAISE NOTICE '';
END $$;
