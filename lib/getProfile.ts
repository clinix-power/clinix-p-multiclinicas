import { supabase } from './supabaseClient'

export type MyProfile = {
  id: string
  role: string
  clinica_id: string | null
  is_master_admin: boolean
  is_active: boolean
  nome: string | null
}

/**
 * Busca o profile completo do usuário autenticado.
 * Retorna null se não houver sessão ou profile.
 * clinica_id vem SEMPRE do banco — nunca de parâmetro externo.
 */
export async function getMyProfile(): Promise<MyProfile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, clinica_id, is_master_admin, is_active, nome')
    .eq('id', user.id)
    .single()

  if (error || !data) return null
  return data as MyProfile
}
