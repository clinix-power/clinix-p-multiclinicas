'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function ResetPasswordPage() {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Garante que o usuário chegou via link de recovery
  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/login')
      }
    }
    checkSession()
  }, [router])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return

    setError(null)

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    })

    if (updateError) {
      setLoading(false)
      setError(updateError.message || 'Erro ao redefinir senha.')
      return
    }

    setSuccess(true)

    setTimeout(() => {
      router.replace('/login')
    }, 2500)
  }

  return (
    <div className="min-h-screen px-4 text-white bg-[#07070A]">
      {/* fundo premium */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#07070A] to-[#0B0B10]" />
        <div className="absolute inset-0 [background:radial-gradient(900px_400px_at_50%_0%,rgba(255,255,255,0.06),transparent_55%)]" />
      </div>

      <div className="relative min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* branding */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 drop-shadow-[0_0_18px_rgba(168,85,247,0.6)]"
                  fill="none"
                >
                  <path
                    d="M13 2 4 14h7l-1 8 10-14h-7l0-6Z"
                    fill="url(#grad)"
                  />
                  <defs>
                    <linearGradient id="grad" x1="4" y1="2" x2="20" y2="22">
                      <stop stopColor="rgba(217,70,239,0.95)" />
                      <stop offset="0.5" stopColor="rgba(168,85,247,0.95)" />
                      <stop offset="1" stopColor="rgba(99,102,241,0.95)" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              <h1 className="text-3xl font-semibold tracking-tight">
                Clinix Power
              </h1>
            </div>

            <p className="mt-2 text-sm text-white/55">
              Redefinição de senha segura
            </p>
          </div>

          {/* card */}
          <form
            onSubmit={handleReset}
            className="
              rounded-3xl p-8 space-y-5
              bg-white/[0.035] backdrop-blur-xl
              border border-white/10
              shadow-[0_40px_140px_rgba(0,0,0,0.75)]
            "
          >
            <h2 className="text-sm font-medium text-center text-white/85">
              Crie uma nova senha
            </h2>

            <input
              type="password"
              placeholder="Nova senha"
              className="
                w-full px-4 py-3 rounded-2xl
                bg-black/25 border border-white/10
                outline-none focus:border-purple-400/50
                focus:ring-2 focus:ring-purple-500/10
              "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Confirmar nova senha"
              className="
                w-full px-4 py-3 rounded-2xl
                bg-black/25 border border-white/10
                outline-none focus:border-purple-400/50
                focus:ring-2 focus:ring-purple-500/10
              "
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />

            {error && (
              <p className="text-xs text-red-300 text-center">
                {error}
              </p>
            )}

            {success && (
              <p className="text-xs text-green-400 text-center">
                Senha redefinida com sucesso. Redirecionando…
              </p>
            )}

            <button
              type="submit"
              disabled={loading || success}
              className="
                w-full py-3 rounded-2xl font-medium
                border border-white/10
                bg-gradient-to-r from-fuchsia-600/70 via-purple-600/60 to-indigo-600/55
                shadow-[0_18px_60px_rgba(168,85,247,0.25)]
                hover:brightness-110 transition
                disabled:opacity-50
              "
            >
              {loading ? 'Salvando…' : 'Salvar nova senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}