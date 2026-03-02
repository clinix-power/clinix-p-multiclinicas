-- ============================================================================
-- CLINIX POWER - PROMOVER SUPER ADMIN (MASTER ADMIN)
-- Script 100% IDEMPOTENTE - Pode ser executado múltiplas vezes sem erros
-- Data: 27/02/2026
-- ============================================================================

-- IMPORTANTE: Este script NÃO define senha. A senha deve ser configurada
-- manualmente no painel do Supabase em: Authentication > Users
-- Senha a ser definida: Teddiana#29

-- ============================================================================
-- PARTE 1: PROMOVER USUÁRIO A MASTER ADMIN
-- ============================================================================

-- Atualizar ou inserir o perfil do Master Admin
-- Se o usuário já existe em auth.users, atualiza o profile
-- Se não existe em profiles mas existe em auth.users, insere
-- Se não existe em auth.users, não faz nada (usuário precisa ser criado no painel Auth primeiro)

do $$
declare
  v_user_id uuid;
  v_email text := 'stefhonep@gmail.com';
begin
  -- Buscar o ID do usuário em auth.users
  select id into v_user_id
  from auth.users
  where email = v_email;

  -- Se o usuário existe no auth.users
  if v_user_id is not null then
    -- Verificar se já existe em profiles
    if exists (select 1 from public.profiles where id = v_user_id) then
      -- Atualizar registro existente
      update public.profiles
      set 
        is_master_admin = true,
        is_active = true,
        role = 'ADMIN',
        email = v_email,
        nome = coalesce(nome, 'Super Admin')
      where id = v_user_id;
      
      raise notice 'Profile atualizado para Master Admin: %', v_email;
    else
      -- Inserir novo registro em profiles
      insert into public.profiles (id, email, nome, role, is_master_admin, is_active, clinica_id)
      values (v_user_id, v_email, 'Super Admin', 'ADMIN', true, true, null);
      
      raise notice 'Profile criado como Master Admin: %', v_email;
    end if;
  else
    raise notice 'Usuário % não encontrado em auth.users. Crie o usuário manualmente no painel Supabase Auth primeiro.', v_email;
  end if;
end $$;

-- ============================================================================
-- PARTE 2: GARANTIR POLICIES PARA MASTER ADMIN (JÁ EXISTEM, MAS REFORÇAR)
-- ============================================================================

-- As policies já foram criadas no script principal (20260227_saas_idempotent.sql)
-- Este script apenas garante que o usuário está marcado corretamente

-- Verificação: Listar todos os Master Admins ativos
select 
  id,
  email,
  nome,
  role,
  is_master_admin,
  is_active,
  created_at
from public.profiles
where is_master_admin = true
order by created_at;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================

-- PRÓXIMOS PASSOS MANUAIS:
-- 1. Se o usuário stefhonep@gmail.com NÃO existe em auth.users:
--    - Vá para: Supabase Dashboard > Authentication > Users
--    - Clique em "Add user" > "Create new user"
--    - Email: stefhonep@gmail.com
--    - Password: Teddiana#29
--    - Clique em "Create user"
--    - Execute este script novamente
--
-- 2. Se o usuário JÁ existe mas precisa redefinir senha:
--    - Vá para: Supabase Dashboard > Authentication > Users
--    - Encontre stefhonep@gmail.com
--    - Clique nos 3 pontinhos > "Reset password"
--    - Defina: Teddiana#29
--
-- 3. Após executar este script, faça login com:
--    - Email: stefhonep@gmail.com
--    - Senha: Teddiana#29
--    - Você terá acesso total ao sistema como Master Admin
