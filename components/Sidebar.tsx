'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import SidebarMenu from './SidebarMenu'
import { supabase, ensureValidSession } from '@/lib/supabaseClient'
import { clearAuthCookie, getAuthCookieRole } from '@/lib/authCookie'
import { LogOut, Menu, X } from 'lucide-react'
import ClinixIcon from './ClinixIcon'

type Role = 'ADMIN' | 'FUNCIONARIO' | null

function isHttpUrl(v: string) {
  return /^https?:\/\//i.test(v)
}

function BrandingDots() {
  const base = 'h-1.5 w-1.5 rounded-full opacity-80'

  return (
    <div className="mt-2 flex items-center gap-2">
      <span className={`${base} bg-purple-500`} style={{ animation: 'cpFloat 3s ease-in-out infinite' }} />
      <span className={`${base} bg-sky-500`} style={{ animation: 'cpFloat 3s ease-in-out infinite 160ms' }} />
      <span className={`${base} bg-emerald-500`} style={{ animation: 'cpFloat 3s ease-in-out infinite 320ms' }} />
      <style jsx>{`
        @keyframes cpFloat {
          0%,100% { transform: translateY(0); opacity: .6; }
          50% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const menuRef = useRef<HTMLDivElement | null>(null)

  const [avatarSrc, setAvatarSrc] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [role, setRole] = useState<Role>(() => (getAuthCookieRole() as Role) ?? null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    let mounted = true

    async function load() {
      const user = await ensureValidSession()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, nome, role')
        .eq('id', user.id)
        .single()

      if (!mounted || !profile) {
        // Se a query falhar, role já está no cookie — não sobrescreve
        return
      }

      setNome(profile.nome || 'Usuário')
      // Só atualiza role se vier um valor válido do banco
      if (profile.role === 'ADMIN' || profile.role === 'FUNCIONARIO') {
        setRole(profile.role)
      }

      const raw = profile.avatar_url
      if (!raw) return

      if (isHttpUrl(raw)) {
        setAvatarSrc(raw)
      } else {
        const { data: signed } = await supabase.storage.from('avatars').createSignedUrl(raw, 3600)
        setAvatarSrc(signed?.signedUrl ?? null)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const initials = useMemo(
    () =>
      (nome || 'U')
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase(),
    [nome]
  )

  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    clearAuthCookie()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const DesktopSidebarContent = (
    <aside className="h-full w-[280px] flex flex-col bg-white/80 backdrop-blur-md border-r border-slate-100">
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-[10px] bg-gradient-to-br from-purple-50 to-purple-100/80 border border-purple-200/40 flex items-center justify-center shrink-0">
            <ClinixIcon size={18} className="logo-pulse" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[13px] font-bold tracking-tight text-slate-900 leading-none">Clinix Power</h1>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-none">Advanced Clinical System</p>
          </div>
        </div>
      </div>

      <div ref={menuRef} className="flex-1 px-3 py-4 overflow-y-auto">
        <SidebarMenu role={role} />
      </div>

      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
            {avatarSrc ? (
              <img src={avatarSrc} className="h-full w-full object-cover" alt={nome} />
            ) : (
              <span className="text-xs font-semibold text-purple-700">{initials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 truncate">{nome}</p>
            <p className="text-[10px] text-slate-500">
              {role === 'ADMIN' ? 'Administrador' : 'Funcionário'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition disabled:opacity-50"
            title="Sair"
          >
            <LogOut className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center">
          {new Date().getFullYear()} Clinix Power
        </p>
      </div>
    </aside>
  )

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-white/90 backdrop-blur-lg border-b border-slate-100 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100/80 border border-purple-200/40 flex items-center justify-center shrink-0">
            <ClinixIcon size={15} className="logo-pulse" />
          </div>
          <span className="text-[13px] font-bold tracking-tight text-slate-900">Clinix Power</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <div className="mx-2 mb-2 bg-white/90 backdrop-blur-lg rounded-2xl border border-slate-200 shadow-lg shadow-slate-900/10 overflow-hidden">
          <div className="px-1 py-1.5">
            <SidebarMenu role={role} mobile />
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex">
          <div
            className="flex-1 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="w-[280px] h-full bg-white/80 backdrop-blur-2xl backdrop-saturate-150 border-l border-purple-100/40 flex flex-col">
            <div className="p-4 border-b border-purple-100/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClinixIcon size={16} className="logo-pulse" />
                <h2 className="text-sm font-bold tracking-tight text-slate-900">Menu</h2>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="h-8 w-8 rounded-lg border border-purple-200/40 bg-purple-50/60 hover:bg-purple-100/80 flex items-center justify-center transition-all active:scale-95"
              >
                <X className="w-4 h-4 text-purple-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center overflow-hidden">
                    {avatarSrc ? (
                      <img src={avatarSrc} className="h-full w-full object-cover" alt={nome} />
                    ) : (
                      <span className="text-sm font-semibold text-purple-700">{initials}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">{nome}</p>
                    <p className="text-xs text-slate-600">
                      {role === 'ADMIN' ? 'Administrador' : 'Funcionário'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <SidebarMenu role={role} />
              </div>
            </div>

            <div className="p-4 border-t border-purple-100/30">
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm font-semibold shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/35 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {loggingOut ? 'Saindo...' : 'Sair'}
              </button>
              <p className="mt-3 text-[10px] text-slate-400 text-center">
                {new Date().getFullYear()} Clinix Power Todos os direitos reservados
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="hidden md:block fixed top-0 left-0 h-screen z-40">
        {DesktopSidebarContent}
      </div>
    </>
  )
}