-- ════════════════════════════════════════════════════════════════════════════
-- MISSÕES 2 E 3 - MASTER ADMIN + CADASTRO CLÍNICA COMPLETO
-- ════════════════════════════════════════════════════════════════════════════
-- Data: 2026-02-28
-- Objetivo: Configurar Master Admin e adicionar campos obrigatórios ao cadastro
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- MISSÃO 2: MASTER ADMIN
-- ────────────────────────────────────────────────────────────────────────────

-- Confirmar email do Master Admin (caso não esteja confirmado)
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'stefhonep@gmail.com' 
  AND email_confirmed_at IS NULL;

-- Criar ou atualizar profile do Master Admin (idempotente)
INSERT INTO public.profiles (id, email, nome, role, is_master_admin, is_active, clinica_id)
SELECT 
  au.id, 
  'stefhonep@gmail.com', 
  'Master Admin', 
  'ADMIN', 
  true, 
  true, 
  null
FROM auth.users au 
WHERE au.email = 'stefhonep@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  is_master_admin = true,
  is_active = true,
  role = 'ADMIN',
  nome = COALESCE(profiles.nome, 'Master Admin'),
  email = 'stefhonep@gmail.com';

-- ────────────────────────────────────────────────────────────────────────────
-- MISSÃO 3A: CAMPOS OBRIGATÓRIOS NO CADASTRO DE CLÍNICA
-- ────────────────────────────────────────────────────────────────────────────

-- Adicionar coluna whatsapp se não existir
ALTER TABLE public.clinicas 
ADD COLUMN IF NOT EXISTS whatsapp text;

-- Adicionar coluna cidade se não existir
ALTER TABLE public.clinicas 
ADD COLUMN IF NOT EXISTS cidade text;

-- Adicionar coluna estado se não existir
ALTER TABLE public.clinicas 
ADD COLUMN IF NOT EXISTS estado text;

-- Comentários para documentação
COMMENT ON COLUMN public.clinicas.whatsapp IS 'WhatsApp da clínica para contato direto (formato: 5511999999999)';
COMMENT ON COLUMN public.clinicas.cidade IS 'Cidade onde a clínica está localizada';
COMMENT ON COLUMN public.clinicas.estado IS 'Estado (UF) onde a clínica está localizada';

-- ────────────────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO FINAL
-- ────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_profile_exists boolean;
  v_user_id uuid;
  v_whatsapp_exists boolean;
  v_cidade_exists boolean;
  v_estado_exists boolean;
BEGIN
  -- Verificar Master Admin
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'stefhonep@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '⚠️  AVISO: Usuário stefhonep@gmail.com não encontrado em auth.users. Crie o usuário manualmente no painel do Supabase.';
  ELSE
    SELECT EXISTS(
      SELECT 1 FROM public.profiles 
      WHERE id = v_user_id 
        AND is_master_admin = true 
        AND is_active = true
    ) INTO v_profile_exists;
    
    IF v_profile_exists THEN
      RAISE NOTICE '✅ SUCESSO: Master Admin configurado corretamente para stefhonep@gmail.com (ID: %)', v_user_id;
    ELSE
      RAISE NOTICE '⚠️  AVISO: Profile existe mas is_master_admin ou is_active pode estar incorreto.';
    END IF;
  END IF;

  -- Verificar colunas da tabela clinicas
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clinicas' 
    AND column_name = 'whatsapp'
  ) INTO v_whatsapp_exists;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clinicas' 
    AND column_name = 'cidade'
  ) INTO v_cidade_exists;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clinicas' 
    AND column_name = 'estado'
  ) INTO v_estado_exists;

  IF v_whatsapp_exists AND v_cidade_exists AND v_estado_exists THEN
    RAISE NOTICE '✅ SUCESSO: Todas as colunas obrigatórias foram adicionadas à tabela clinicas';
  ELSE
    RAISE NOTICE '⚠️  AVISO: Algumas colunas podem não ter sido criadas. WhatsApp: %, Cidade: %, Estado: %', 
      v_whatsapp_exists, v_cidade_exists, v_estado_exists;
  END IF;

  RAISE NOTICE '🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!';
END $$;
