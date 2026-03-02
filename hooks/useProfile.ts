import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export type UserRole = 'ADMIN' | 'FUNCIONARIO'

export type Profile = {
  id: string
  nome: string
  email: string
  role: UserRole
  clinica_id: string
  profissao?: string | null
  registro_tipo?: string | null
  registro_numero?: string | null
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/login')
          return
        }

        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('id, nome, email, role, clinica_id, profissao, registro_tipo, registro_numero')
          .eq('id', session.user.id)
          .single()

        if (profileError) throw profileError

        setProfile(data as Profile)

        // Strict role verification with cache clearing
        const path = window.location.pathname

        if ((path.startsWith('/admin') || path === '/dashboard-admin') && data.role !== 'ADMIN') {
          console.warn('Role mismatch: ADMIN route accessed by', data.role)
          router.refresh() // Clear Next.js cache
          router.push('/dashboard-funcionario')
          return
        }

        if ((path.startsWith('/funcionario') || path === '/dashboard-funcionario') && data.role !== 'FUNCIONARIO') {
          console.warn('Role mismatch: FUNCIONARIO route accessed by', data.role)
          router.refresh() // Clear Next.js cache
          router.push('/dashboard-admin')
          return
        }
      } catch (e: any) {
        console.error('Error loading profile:', e)
        setError(e?.message || 'Erro ao carregar perfil')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        router.push('/login')
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadProfile()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  return { profile, loading, error }
}
