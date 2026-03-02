'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { setAuthCookie, clearAuthCookie } from '@/lib/authCookie'
import ClinixIcon from '@/components/ClinixIcon'

/* ✅ Bolinhas padrão POLIMENTO MAX (Roxa, Azul, Verde) */
function BrandingDots() {
  const base = 'h-1.5 w-1.5 rounded-full opacity-80 will-change-transform'

  return (
    <div className="mt-3 flex items-center justify-center gap-2">
      <span
        className={`${base} bg-purple-500/75`}
        style={{ animation: 'cpFloat 3.2s ease-in-out infinite' }}
      />
      <span
        className={`${base} bg-sky-500/75`}
        style={{ animation: 'cpFloat 3.2s ease-in-out infinite 240ms' }}
      />
      <span
        className={`${base} bg-emerald-500/70`}
        style={{ animation: 'cpFloat 3.2s ease-in-out infinite 480ms' }}
      />
      <style jsx>{`
        @keyframes cpFloat {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0.65;
          }
          50% {
            transform: translateY(-6px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Forgot password
  const [fpOpen, setFpOpen] = useState(false)
  const [fpEmail, setFpEmail] = useState('')
  const [fpLoading, setFpLoading] = useState(false)
  const [fpMsg, setFpMsg] = useState<string | null>(null)

  // ✅ cooldown local pra evitar RATE LIMIT (e UX)
  const [fpCooldownUntil, setFpCooldownUntil] = useState<number>(0)

  // PWA install
  const [installReady, setInstallReady] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [installHelpOpen, setInstallHelpOpen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  // Lê erro da URL apenas UMA VEZ (blindado)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const e = params.get('e')
      if (e) setError(e)
    }
  }, [])

  // ✅ ticker leve pro countdown atualizar
  useEffect(() => {
    if (!fpCooldownUntil) return
    const t = setInterval(() => {
      setFpCooldownUntil((v) => v)
    }, 400)
    return () => clearInterval(t)
  }, [fpCooldownUntil])

  const fpCooldownSeconds = useMemo(() => {
    const diff = Math.ceil((fpCooldownUntil - Date.now()) / 1000)
    return diff > 0 ? diff : 0
  }, [fpCooldownUntil])

  // PWA: captura o prompt (Android/Desktop)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const ua = window.navigator.userAgent || ''
    const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    setIsIOS(iOS)

    const standalone =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    function onBeforeInstallPrompt(e: any) {
      e.preventDefault()
      setDeferredPrompt(e)
      setInstallReady(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as any)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as any)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return

    setError(null)
    setLoading(true)

    try {
      console.log('Login iniciado')

      // Step 1: Sign in
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError || !data.user) {
        console.error('Auth error:', authError)
        setLoading(false)
        setError('E-mail ou senha inválidos')
        return
      }

      console.log('Auth successful, user ID:', data.user.id)

      // Step 2: Load profile (instant - no delays)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_active, is_master_admin')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        console.error('Profile error:', profileError)
        clearAuthCookie()
        await supabase.auth.signOut()
        setLoading(false)
        setError('Perfil não encontrado')
        return
      }

      console.log('Perfil carregado:', profile.role)

      // Step 3: Validate active status
      if (!profile.is_active) {
        clearAuthCookie()
        await supabase.auth.signOut()
        setLoading(false)
        setError('Usuário inativo. Contate o administrador.')
        return
      }

      // Step 4: Determine redirect path - check is_master_admin first
      let redirectPath = ''
      if (profile.is_master_admin === true) {
        // Master Admin sempre vai para /admin/master
        redirectPath = '/admin/master'
      } else if (profile.role === 'ADMIN') {
        redirectPath = '/dashboard-admin'
      } else if (profile.role === 'FUNCIONARIO') {
        redirectPath = '/dashboard-funcionario'
      } else {
        // Invalid role - sign out and show error
        clearAuthCookie()
        await supabase.auth.signOut()
        setLoading(false)
        setError('Perfil sem permissão de acesso. Contate o administrador.')
        return
      }

      console.log('Iniciando redirecionamento para:', redirectPath)

      // Step 5: Set auth cookie with role for middleware, then redirect
      setAuthCookie(profile.role as string)
      router.push(redirectPath)
    } catch (err: any) {
      console.error('Login error:', err)
      setLoading(false)
      setError(err?.message || 'Erro ao fazer login. Tente novamente.')
    }
  }

  async function handleForgotPassword() {
    if (fpLoading) return

    if (fpCooldownSeconds > 0) {
      setFpMsg(`Aguarde ${fpCooldownSeconds}s para tentar novamente.`)
      return
    }

    setFpMsg(null)
    setError(null)

    const e = (fpEmail || '').trim()
    if (!e) {
      setFpMsg('Informe seu e-mail.')
      return
    }

    setFpLoading(true)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const redirectTo = origin ? `${origin}/login` : undefined

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo,
      })

      if (resetError) {
        const msg = resetError.message || 'Falha ao enviar e-mail.'
        const lower = msg.toLowerCase()
        if (lower.includes('rate limit')) {
          setFpCooldownUntil(Date.now() + 90_000)
          setFpMsg(
            'Muitas tentativas em pouco tempo. Aguarde 90s e tente novamente. (Isso é limite de envio do Supabase)'
          )
        } else {
          setFpCooldownUntil(Date.now() + 15_000)
          setFpMsg(`Não foi possível enviar: ${msg}`)
        }
      } else {
        setFpCooldownUntil(Date.now() + 60_000)
        setFpMsg('Enviamos um link de redefinição para seu e-mail (verifique SPAM).')
      }
    } catch {
      setFpCooldownUntil(Date.now() + 15_000)
      setFpMsg('Erro ao enviar e-mail de redefinição.')
    } finally {
      setFpLoading(false)
    }
  }

  async function handleInstallClick() {
    if (isStandalone) return

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        await deferredPrompt.userChoice
      } finally {
        setDeferredPrompt(null)
        setInstallReady(false)
      }
      return
    }

    setInstallHelpOpen(true)
  }

  const ShellClass =
    'min-h-screen px-4 text-slate-900 bg-[var(--background)] relative overflow-x-hidden'
  const CardClass =
    'rounded-3xl p-4 space-y-3 border border-black/5 bg-white/70 backdrop-blur-xl ' +
    'shadow-[0_26px_90px_rgba(15,23,42,0.10)]'

  return (
    <div className={ShellClass}>
      {/* Fundo premium alinhado ao global (sem “matar” o mesh do body) */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-transparent" />
        <div className="absolute inset-0 [background:radial-gradient(900px_420px_at_50%_0%,rgba(168,85,247,0.16),transparent_60%)]" />
        <div className="absolute inset-0 [background:radial-gradient(900px_520px_at_90%_30%,rgba(99,102,241,0.12),transparent_65%)]" />
        <div className="absolute inset-0 [background:radial-gradient(700px_520px_at_10%_75%,rgba(217,70,239,0.08),transparent_60%)]" />
      </div>

      <div className="relative min-h-screen flex items-center justify-center py-10">
        <div className="w-full max-w-5xl">
          {/* BRANDING */}
          <div className="mb-4 text-center">
            <div className="inline-flex items-center justify-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/80 border border-purple-200/40 flex items-center justify-center">
                <ClinixIcon size={20} className="logo-pulse" />
              </div>
              <div className="text-left">
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 leading-none">
                  Clinix Power
                </h1>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-none tracking-wide">
                  Advanced Clinical System
                </p>
              </div>
            </div>

            {/* ✅ Polimento Max dots (Roxa, Azul, Verde) */}
            <BrandingDots />
          </div>

          {/* LOGIN */}
          <div className="mx-auto w-full max-w-[360px]">
            <form onSubmit={handleLogin} className={CardClass}>
              <div className="text-center">
                <h2 className="text-[12px] font-medium text-slate-900/90">Acesso restrito</h2>
                <p className="mt-1 text-[11px] text-slate-600/80">
                  Entre com suas credenciais para continuar.
                </p>
              </div>

              <input
                type="email"
                placeholder="E-mail"
                className="
                  w-full px-3.5 py-2.5 rounded-2xl
                  bg-white/70 border border-black/5 text-slate-900
                  outline-none focus:border-indigo-400/70
                  focus:ring-2 focus:ring-indigo-500/10
                  text-sm
                "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha"
                  className="
                    w-full px-3.5 py-2.5 rounded-2xl
                    bg-white/70 border border-black/5 text-slate-900
                    pr-20 outline-none focus:border-indigo-400/70
                    focus:ring-2 focus:ring-indigo-500/10
                    text-sm
                  "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[11px] text-slate-600 hover:text-slate-900 transition"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {error && <p className="text-[11px] text-rose-600 text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="
                  w-full h-11 px-5 rounded-lg font-semibold
                  bg-gradient-to-br from-purple-500 to-purple-600
                  hover:from-purple-600 hover:to-purple-700
                  text-white text-sm
                  shadow-lg shadow-purple-400/30
                  hover:shadow-xl hover:shadow-purple-400/40
                  transition-all active:scale-95
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              <div className="flex items-center justify-between pt-0.5">
                <button
                  type="button"
                  className="text-[11px] text-slate-600 hover:text-slate-900 transition"
                  onClick={() => {
                    setFpMsg(null)
                    setFpEmail(email || '')
                    setFpOpen(true)
                  }}
                >
                  Esqueci minha senha
                </button>

                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={isStandalone}
                  className="
                    inline-flex items-center justify-center
                    px-3 py-2 rounded-xl text-[11px] font-medium
                    border border-black/5 bg-white/70 backdrop-blur
                    text-slate-700 hover:text-slate-900 hover:bg-white/80 transition
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                  title={isStandalone ? 'App já instalado' : 'Instalar no celular'}
                >
                  {isStandalone ? 'Instalado' : 'Baixar no celular'}
                </button>
              </div>
            </form>
          </div>

          {/* MODAL: Forgot Password */}
          {fpOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
              <div className="w-full max-w-sm rounded-3xl border border-black/5 bg-white/80 backdrop-blur-xl shadow-[0_40px_120px_rgba(15,23,42,0.20)] p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Recuperar senha</h3>
                    <p className="mt-1 text-xs text-slate-600/80">
                      Enviaremos um link de redefinição para seu e-mail.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFpOpen(false)}
                    className="text-slate-600 hover:text-slate-900 transition"
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  <input
                    type="email"
                    placeholder="Seu e-mail"
                    className="
                      w-full px-4 py-3 rounded-2xl
                      bg-white/80 border border-black/5 text-slate-900
                      outline-none focus:border-indigo-400/70
                      focus:ring-2 focus:ring-indigo-500/10
                    "
                    value={fpEmail}
                    onChange={(e) => setFpEmail(e.target.value)}
                  />

                  {fpMsg && <p className="text-xs text-slate-700">{fpMsg}</p>}

                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={fpLoading || fpCooldownSeconds > 0}
                    className="
                      w-full py-3 rounded-2xl font-medium
                      border border-black/10 bg-slate-900
                      text-white hover:bg-slate-800 transition
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                  >
                    {fpCooldownSeconds > 0
                      ? `Aguarde ${fpCooldownSeconds}s`
                      : fpLoading
                        ? 'Enviando…'
                        : 'Enviar link'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFpOpen(false)}
                    className="w-full text-xs text-slate-600 hover:text-slate-900 transition"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL: Install Help */}
          {installHelpOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
              <div className="w-full max-w-sm rounded-3xl border border-black/5 bg-white/80 backdrop-blur-xl shadow-[0_40px_120px_rgba(15,23,42,0.20)] p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Instalar no celular</h3>
                    <p className="mt-1 text-xs text-slate-600/80">
                      {installReady
                        ? 'Toque em “Instalar agora”.'
                        : isIOS
                          ? 'No iPhone: Compartilhar → “Adicionar à Tela de Início”.'
                          : 'No Chrome: Menu → “Instalar app”.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInstallHelpOpen(false)}
                    className="text-slate-600 hover:text-slate-900 transition"
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!deferredPrompt) return
                      try {
                        deferredPrompt.prompt()
                        await deferredPrompt.userChoice
                      } finally {
                        setDeferredPrompt(null)
                        setInstallReady(false)
                        setInstallHelpOpen(false)
                      }
                    }}
                    disabled={!deferredPrompt}
                    className="
                      w-full py-3 rounded-2xl font-medium
                      border border-black/5
                      bg-gradient-to-r from-fuchsia-600/85 via-purple-600/80 to-indigo-600/80
                      shadow-[0_18px_54px_rgba(99,102,241,0.18)]
                      hover:brightness-110 transition disabled:opacity-50
                      text-white
                    "
                  >
                    Instalar agora
                  </button>

                  <button
                    type="button"
                    onClick={() => setInstallHelpOpen(false)}
                    className="mt-3 w-full text-xs text-slate-600 hover:text-slate-900 transition"
                  >
                    Entendi
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}