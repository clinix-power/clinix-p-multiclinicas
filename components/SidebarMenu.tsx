'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode, useEffect, useState } from 'react'
import { supabase, ensureValidSession } from '@/lib/supabaseClient'

type Role = 'ADMIN' | 'FUNCIONARIO' | null

/* =========================
   ICON WRAP — ELITE PRECISION
   ========================= */
function IconWrap({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span className={active ? 'text-purple-600' : 'text-slate-500 group-hover:text-slate-700 transition-colors'}>
      {children}
    </span>
  )
}

/* =========================
   MENU
   ========================= */
type SidebarMenuComponent = (props: { role: Role; mobile?: boolean }) => JSX.Element

const SidebarMenu: SidebarMenuComponent = ({ role, mobile = false }) => {
  const pathname = usePathname()
  const [isMasterAdmin, setIsMasterAdmin] = useState(false)

  useEffect(() => {
    async function checkMasterAdmin() {
      try {
        const user = await ensureValidSession()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_master_admin')
          .eq('id', user.id)
          .single()

        if (profile?.is_master_admin) {
          setIsMasterAdmin(true)
        }
      } catch (err) {
        console.error('[SidebarMenu] Erro ao verificar master admin:', err)
      }
    }

    checkMasterAdmin()
  }, [])

  function Item({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
    const active = pathname === href || pathname.startsWith(href + '/')

    if (mobile) {
      return (
        <Link
          href={href}
          className="flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 min-w-0 flex-1 rounded-xl transition-all duration-200 active:scale-95"
        >
          <span className={active ? 'text-purple-600' : 'text-slate-500'}>
            {icon}
          </span>
          <span className={`text-[10px] font-semibold tracking-tight truncate max-w-full ${
            active ? 'text-purple-600' : 'text-slate-600'
          }`}>
            {label}
          </span>
        </Link>
      )
    }

    return (
      <Link
        href={href}
        className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
          active
            ? 'bg-purple-50/50 text-purple-600'
            : 'text-slate-700 hover:bg-slate-50/80 hover:translate-x-1'
        }`}
      >
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-purple-500 via-indigo-500 to-purple-600" />
        )}
        <IconWrap active={active}>{icon}</IconWrap>
        <span className={`text-sm font-medium tracking-tight truncate ${
          active ? 'text-purple-600' : 'text-slate-700 group-hover:text-slate-900'
        }`}>
          {label}
        </span>
      </Link>
    )
  }

  function SectionTitle({ children }: { children: string }) {
    return (
      <h3 className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
        {children}
      </h3>
    )
  }

  // MOBILE BOTTOM DOCK (Compact horizontal layout)
  if (mobile) {
    return (
      <nav className="flex items-center justify-around gap-1">
        {role === 'ADMIN' && (
          <>
            <Item href="/dashboard-admin" label="Home" icon={<IcDashboard />} />
            <Item href="/pacientes" label="Pacientes" icon={<IcPacientes />} />
            <Item href="/agenda" label="Agenda" icon={<IcAgenda />} />
            <Item href="/evolucoes" label="Evoluções" icon={<IcEvolucoes />} />
          </>
        )}
        {role === 'FUNCIONARIO' && (
          <>
            <Item href="/dashboard-funcionario" label="Home" icon={<IcDashboard />} />
            <Item href="/agenda-funcionario" label="Agenda" icon={<IcAgenda />} />
            <Item href="/evolucoes/minhas" label="Evoluções" icon={<IcEvolucoes />} />
            <Item href="/meu-perfil" label="Perfil" icon={<IcPerfil />} />
          </>
        )}
      </nav>
    )
  }

  // DESKTOP SIDEBAR (Slim precision layout)
  return (
    <nav className="space-y-1">
      {role === 'ADMIN' && (
        <>
          <SectionTitle>Principal</SectionTitle>
          <Item href="/dashboard-admin" label="Dashboard" icon={<IcDashboard />} />
          <Item href="/pacientes" label="Pacientes" icon={<IcPacientes />} />
          <Item href="/profissionais" label="Profissionais" icon={<IcProfissionais />} />
          <Item href="/agenda" label="Agenda" icon={<IcAgenda />} />
          <Item href="/evolucoes" label="Evoluções" icon={<IcEvolucoes />} />
          
          <div className="pt-4">
            <SectionTitle>Administração</SectionTitle>
            <Item href="/admin/financeiro" label="Financeiro" icon={<IcFinanceiro />} />
            <Item href="/admin/laudos" label="Laudos" icon={<IcLaudos />} />
            <Item href="/admin/equipe" label="Equipe" icon={<IcProfissionais />} />
            <Item href="/admin/relatorios" label="Relatórios" icon={<IcRelatorios />} />
            <Item href="/admin/convenios" label="Convênios" icon={<IcConvenios />} />
            {isMasterAdmin && (
              <Item href="/admin/master/clinicas" label="Master Admin" icon={<IcMasterAdmin />} />
            )}
          </div>
        </>
      )}

      {role === 'FUNCIONARIO' && (
        <>
          <SectionTitle>Principal</SectionTitle>
          <Item href="/dashboard-funcionario" label="Dashboard" icon={<IcDashboard />} />
          <Item href="/agenda-funcionario" label="Agenda" icon={<IcAgenda />} />
          <Item href="/evolucoes/minhas" label="Evoluções" icon={<IcEvolucoes />} />
          <Item href="/avaliacao-admissional" label="Avaliação" icon={<IcAvaliacao />} />
          <Item href="/laudos" label="Laudos" icon={<IcLaudos />} />
        </>
      )}

      <div className="pt-4">
        <SectionTitle>Conta</SectionTitle>
        <Item href="/meu-perfil" label="Meu perfil" icon={<IcPerfil />} />
        {role === 'ADMIN' && (
          <Item href="/admin/minha-assinatura" label="Minha Assinatura" icon={<IcAssinatura />} />
        )}
      </div>
    </nav>
  )
}

export default SidebarMenu

/* =========================
   ICONS — POLIMENTO GLOBAL
   (apenas SVGs, sem lógica)
   ========================= */

function IcDashboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IcPacientes() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.5 20c1.2-3 3.8-5 6.5-5s5.3 2 6.5 5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function IcProfissionais() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="7" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 7V5h6v2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 12h16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IcAgenda() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 10h16M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IcEvolucoes() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3l2.2 6.2L21 11l-6.8 1.8L12 19l-2.2-6.2L3 11l6.8-1.8L12 3z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function IcRelatorios() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IcPerfil() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 20c1.6-3.4 4.4-5.5 7-5.5s5.4 2.1 7 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function IcLaudos() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 3v4l2-1.5L20 7V3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IcAvaliacao() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="2" r="1" fill="currentColor" />
    </svg>
  )
}

function IcMasterAdmin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IcFinanceiro() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="14" width="4" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="10" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="17" y="6" width="4" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 11l4-4 4 2 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IcConvenios() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M7 7H4a1 1 0 00-1 1v9a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="7" y="4" width="10" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 11v6M9 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IcAssinatura() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}