'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, ensureValidSession } from '@/lib/supabaseClient'
import { clearAuthCookie } from '@/lib/authCookie'
import ClinixIcon from './ClinixIcon'

export default function MasterAdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    let alive = true

    async function checkMasterAdmin() {
      try {
        setLoading(true)

        const user = await ensureValidSession()

        if (!user) {
          clearAuthCookie()
          if (alive) router.replace('/login')
          return
        }

        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('is_master_admin, is_active')
          .eq('id', user.id)
          .single()

        if (profileErr) throw profileErr

        if (!profile || !profile.is_active || !profile.is_master_admin) {
          if (alive) router.replace('/dashboard-admin')
          return
        }

        if (alive) {
          setAuthorized(true)
          setLoading(false)
        }
      } catch (err) {
        console.error('[MasterAdminGate]', err)
        if (alive) router.replace('/dashboard-admin')
      }
    }

    checkMasterAdmin()

    return () => {
      alive = false
    }
  }, [router])

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
        <p className="mt-4 text-sm text-slate-600">Verificando permissões...</p>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return <>{children}</>
}
