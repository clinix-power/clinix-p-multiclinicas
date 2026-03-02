'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Role = 'ADMIN' | 'FUNCIONARIO' | null

const WELCOME_STORAGE_KEY = 'clinix_welcome_seen_v1'

export default function WelcomePage() {
  const router = useRouter()
  const [role, setRole] = useState<Role>(null)

  function homeByRole(r: Role) {
    return r === 'FUNCIONARIO' ? '/dashboard-funcionario' : '/dashboard'
  }

  useEffect(() => {
    let alive = true

    async function loadRole() {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!alive) return
      setRole((profile?.role ?? null) as Role)
    }

    loadRole()
    return () => {
      alive = false
    }
  }, [])

  function iniciar() {
    try {
      localStorage.setItem(WELCOME_STORAGE_KEY, '1')
    } catch {}

    router.replace(homeByRole(role))
  }

  return (
    <div className="min-h-[calc(100vh-120px)] w-full flex items-center justify-center">
      <div className="w-full max-w-xl rounded-3xl border border-neutral-200 bg-white shadow-2xl p-8 text-center">
        <div className="text-xs tracking-widest text-neutral-500">CLINIX POWER</div>

        <h1 className="mt-3 text-3xl font-semibold text-neutral-950">
          Bem-vindo à sua nova rotina clínica.
        </h1>

        <p className="mt-3 text-sm text-neutral-600 leading-relaxed">
          Agenda inteligente, pacientes organizados e evoluções com padrão premium.
          Tudo pronto para você operar com clareza e velocidade.
        </p>

        <div className="mt-8 flex items-center justify-center">
          <button
            onClick={iniciar}
            className="px-6 py-3 rounded-2xl bg-neutral-900 text-white hover:bg-black transition"
          >
            Iniciar sistema
          </button>
        </div>

        <p className="mt-4 text-xs text-neutral-500">
          Dica: o botão de instalar no celular fica sempre no menu lateral.
        </p>
      </div>
    </div>
  )
}
