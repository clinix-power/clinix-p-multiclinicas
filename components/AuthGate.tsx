'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, ensureValidSession } from '@/lib/supabaseClient'
import { clearAuthCookie, setAuthCookie } from '@/lib/authCookie'
import ClinixIcon from './ClinixIcon'

type Role = 'ADMIN' | 'FUNCIONARIO' | null

export default function AuthGate({
  allow,
  children,
}: {
  allow: Role[]
  children: React.ReactNode
}) {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<Role>(null)

  function homeByRole(r: Role) {
    if (r === 'FUNCIONARIO') return '/dashboard-funcionario'
    if (r === 'ADMIN') return '/dashboard-admin'
    return '/login'
  }

  useEffect(() => {
    let alive = true

    async function run() {
      try {
        setLoading(true)

        // 1) sessão — usa ensureValidSession para refresh proativo
        const user = await ensureValidSession()

        if (!user) {
          clearAuthCookie()
          if (alive) router.replace('/login')
          return
        }

        // 2) profile
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('role, is_active')
          .eq('id', user.id)
          .single()

        if (profileErr) throw profileErr

        if (!profile || !profile.is_active || !profile.role) {
          clearAuthCookie()
          await supabase.auth.signOut()
          if (alive) router.replace('/login')
          return
        }

        const r = profile.role as Role
        if (alive) setRole(r)

        // Atualiza cookie com role correto (garante sincronia middleware ↔ client)
        setAuthCookie(r as string)

        // 3) role permitido
        if (!allow.includes(r)) {
          if (alive) router.replace(homeByRole(r))
          return
        }

        if (alive) setLoading(false)
      } catch (err) {
        console.error('[AuthGate]', err)
        clearAuthCookie()
        if (alive) router.replace('/login')
      }
    }

    run()

    // Listener controlado: renova cookie em token refresh e limpa em logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!alive) return

      if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Renova cookie silenciosamente quando token é refreshed
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
          
          if (profile?.role) {
            setAuthCookie(profile.role as string)
          }
        } catch (err) {
          console.warn('[AuthGate] Erro ao renovar cookie:', err)
        }
      } else if (event === 'SIGNED_OUT') {
        clearAuthCookie()
        if (alive) router.replace('/login')
      }
    })

    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [allow, router])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/80 border border-purple-200/40 flex items-center justify-center">
          <ClinixIcon size={30} className="logo-pulse" />
        </div>
        <div className="mt-6 flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-purple-500/70 animate-bounce"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return <>{children}</>
}