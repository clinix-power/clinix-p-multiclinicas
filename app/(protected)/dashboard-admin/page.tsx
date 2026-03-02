'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, ensureValidSession } from '@/lib/supabaseClient'
import { clearAuthCookie } from '@/lib/authCookie'
import PageHeader from '@/components/ui/page-header'
import { LayoutDashboard } from 'lucide-react'

type Role = 'ADMIN' | 'FUNCIONARIO'
type Stats = {
  totalPacientes: number
  totalAgendamentosHoje: number
  totalProfissionais: number
  pacientesAtivos: number
  pacientesInativos: number
}

function todayISODate() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function MiniSparkline({ value, color = 'blue' }: { value: number; color?: string }) {
  const data = useMemo(() => {
    const base = Math.max(1, Math.floor(value * 0.5))
    return [
      base,
      base + Math.floor(value * 0.12),
      base + Math.floor(value * 0.18),
      base + Math.floor(value * 0.28),
      base + Math.floor(value * 0.45),
      base + Math.floor(value * 0.7),
      value,
    ]
  }, [value])

  const max = Math.max(...data)
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = 100 - (v / max) * 70
      return `${x},${y}`
    })
    .join(' ')

  const colorMap: Record<string, string> = {
    blue: '#3b82f6',
    emerald: '#10b981',
    purple: '#8b5cf6',
    amber: '#f59e0b',
  }

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-8 opacity-40">
      <polyline
        points={points}
        fill="none"
        stroke={colorMap[color] || colorMap.blue}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-[dash_1.5s_ease-in-out_forwards]"
        style={{
          strokeDasharray: 200,
          strokeDashoffset: 200,
        }}
      />
      <style jsx>{`
        @keyframes dash {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </svg>
  )
}

function MiniDonut({ active, inactive }: { active: number; inactive: number }) {
  const total = active + inactive || 1
  const percent = (active / total) * 100

  return (
    <div className="relative w-16 h-16">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeDasharray={`${percent} 100`}
          strokeLinecap="round"
          className="transition-all duration-1000"
          style={{ animation: 'fill 1.2s ease-out' }}
        />
        <style jsx>{`
          @keyframes fill {
            from {
              stroke-dasharray: 0 100;
            }
          }
        `}</style>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-slate-700">{active}</span>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()

  const [role, setRole] = useState<Role | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dateToday = useMemo(() => todayISODate(), [])

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      setError(null)

      // Garante sessão válida com refresh proativo antes de qualquer query
      const user = await ensureValidSession()

      if (!user) {
        clearAuthCookie()
        router.replace('/login')
        return
      }

      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('role, clinica_id')
        .eq('id', user.id)
        .single()

      if (profErr || !profile?.role) {
        setError('Perfil não encontrado (profiles).')
        setLoading(false)
        setRefreshing(false)
        return
      }

      const r = profile.role as Role
      const clinicaId = profile.clinica_id as string | null
      setRole(r)

      const isFuncionario = r === 'FUNCIONARIO'

      async function safeCount(query: any) {
        const res = await query
        if (res?.error) return { count: 0 as number, error: res.error }
        return { count: (res?.count ?? 0) as number, error: null }
      }

      // Todos os counts filtrados pela clínica do usuário
      let pacienteTotalQ = supabase.from('pacientes').select('id', { count: 'exact', head: true })
      if (clinicaId) pacienteTotalQ = (pacienteTotalQ as any).eq('clinica_id', clinicaId)
      if (isFuncionario) pacienteTotalQ = (pacienteTotalQ as any).eq('profissional_responsavel_id', user.id)
      const pacienteTotalP = safeCount(pacienteTotalQ)

      let agHojeQ = supabase
        .from('agendamentos')
        .select('id', { count: 'exact', head: true })
        .eq('data', dateToday)
      if (clinicaId) agHojeQ = (agHojeQ as any).eq('clinica_id', clinicaId)
      if (isFuncionario) agHojeQ = (agHojeQ as any).eq('profissional_id', user.id)
      const agHojeP = safeCount(agHojeQ)

      let profTotalQ = supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .in('role', ['ADMIN', 'FUNCIONARIO'])
        .eq('is_active', true)
      if (clinicaId) profTotalQ = (profTotalQ as any).eq('clinica_id', clinicaId)
      const profTotalP = safeCount(profTotalQ)

      let ativosQ = supabase
        .from('pacientes')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Ativo')
      if (clinicaId) ativosQ = (ativosQ as any).eq('clinica_id', clinicaId)

      let inativosQ = supabase
        .from('pacientes')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Inativo')
      if (clinicaId) inativosQ = (inativosQ as any).eq('clinica_id', clinicaId)

      const ativosP = safeCount(ativosQ)
      const inativosP = safeCount(inativosQ)

      const [pacTotal, agHoje, profTotal, pacAtivos, pacInativos] = await Promise.all([
        pacienteTotalP,
        agHojeP,
        profTotalP,
        ativosP,
        inativosP,
      ])

      const essentialError = pacTotal.error || agHoje.error || profTotal.error
      if (essentialError) {
        setError('Erro ao carregar estatísticas (permissões/RLS).')
      }

      setStats({
        totalPacientes: pacTotal.count,
        totalAgendamentosHoje: agHoje.count,
        totalProfissionais: profTotal.count,
        pacientesAtivos: pacAtivos.count,
        pacientesInativos: pacInativos.count,
      })

      setLoading(false)
      setRefreshing(false)
    },
    [dateToday, router]
  )

  useEffect(() => {
    load(false)
  }, [load])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          {/* Skeleton Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-7 w-32 bg-white rounded-lg animate-pulse" />
              <div className="h-4 w-48 bg-white rounded animate-pulse" />
            </div>
            <div className="h-8 w-24 bg-white rounded-lg animate-pulse" />
          </div>

          {/* Skeleton Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 w-20 bg-slate-100 rounded" />
                  <div className="w-8 h-8 bg-slate-100 rounded-lg" />
                </div>
                <div className="h-8 w-16 bg-slate-100 rounded mb-2" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
            ))}
          </div>

          {/* Skeleton Chart Area */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl p-4 shadow-sm">
              <div className="h-4 w-32 bg-slate-100 rounded mb-4 animate-pulse" />
              <div className="h-48 bg-slate-50 rounded-lg animate-pulse" />
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="h-4 w-28 bg-slate-100 rounded mb-4 animate-pulse" />
              <div className="space-y-3">
                <div className="h-16 bg-slate-50 rounded-lg animate-pulse" />
                <div className="h-16 bg-slate-50 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-sm border border-rose-100">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900">Erro ao carregar</h3>
              <p className="mt-1 text-xs text-slate-600">Não foi possível carregar o dashboard.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <PageHeader
          icon={LayoutDashboard}
          title="Dashboard Administrativo"
          subtitle="Visão geral operacional"
          badge={{ text: 'Em Serviço', variant: 'success' }}
        />

        {loading && (
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-500/80 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="h-2 w-2 rounded-full bg-sky-500/75 animate-bounce" style={{ animationDelay: '160ms' }} />
              <div className="h-2 w-2 rounded-full bg-emerald-500/65 animate-bounce" style={{ animationDelay: '320ms' }} />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-100">
            <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs font-medium text-rose-700">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mb-6">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50 active:scale-95"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {refreshing ? 'Atualizando' : 'Atualizar'}
          </button>
        </div>

        {/* STATS GRID - High Density Cards */}
        <div className="pb-6 space-y-4">
          {/* Primary Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* PACIENTES CARD */}
            <Link href="/pacientes" className="group block">
              <div className="relative bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-100 hover:border-blue-200 hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pacientes</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 leading-none">{stats.totalPacientes}</div>
                    <p className="mt-1 text-xs text-slate-600">Total cadastrados</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                </div>
                <MiniSparkline value={stats.totalPacientes} color="blue" />
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                </div>
              </div>
            </Link>

            {/* AGENDAMENTOS CARD */}
            <Link href={role === 'FUNCIONARIO' ? '/agenda-funcionario' : '/agenda'} className="group block">
              <div className="relative bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-100 hover:border-emerald-200 hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Hoje</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 leading-none">{stats.totalAgendamentosHoje}</div>
                    <p className="mt-1 text-xs text-slate-600">Atendimentos</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </div>
                <MiniSparkline value={stats.totalAgendamentosHoje || 5} color="emerald" />
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </div>
            </Link>

            {/* PROFISSIONAIS CARD */}
            <Link href="/profissionais" className="group block">
              <div className="relative bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-100 hover:border-purple-200 hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Equipe</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 leading-none">{stats.totalProfissionais}</div>
                    <p className="mt-1 text-xs text-slate-600">Profissionais</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                </div>
                <MiniSparkline value={stats.totalProfissionais || 3} color="purple" />
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                </div>
              </div>
            </Link>

            {/* QUICK SUMMARY CARD */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Resumo</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 leading-none">
                    {stats.pacientesAtivos + stats.pacientesInativos}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">Total de pacientes</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-semibold text-slate-700">{stats.pacientesAtivos} Ativos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-700">{stats.pacientesInativos} Inativos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Metrics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* DISTRIBUTION CHART */}
            <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Distribuição de Pacientes</h3>
                  <p className="text-xs text-slate-600 mt-0.5">Status atual do cadastro</p>
                </div>
                <Link
                  href="/pacientes"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                >
                  Ver todos
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* ATIVOS */}
                <div className="group relative overflow-hidden rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-50/50 p-4 hover:shadow-sm transition-all hover:-translate-y-0.5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Ativos</span>
                      </div>
                      <div className="text-3xl font-bold text-emerald-900 leading-none mb-1">
                        {stats.pacientesAtivos}
                      </div>
                      <p className="text-xs text-emerald-700 font-medium">Em tratamento ativo</p>
                    </div>
                    <MiniDonut active={stats.pacientesAtivos} inactive={stats.pacientesInativos} />
                  </div>
                  <div className="pt-3 border-t border-emerald-200">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-emerald-600 font-medium">Porcentagem</span>
                      <span className="font-bold text-emerald-700">
                        {Math.round((stats.pacientesAtivos / (stats.pacientesAtivos + stats.pacientesInativos || 1)) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* INATIVOS */}
                <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-50/50 p-4 hover:shadow-sm transition-all hover:-translate-y-0.5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Inativos</span>
                      </div>
                      <div className="text-3xl font-bold text-slate-900 leading-none mb-1">
                        {stats.pacientesInativos}
                      </div>
                      <p className="text-xs text-slate-600 font-medium">Sem tratamento no momento</p>
                    </div>
                    <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center">
                      <span className="text-xl font-bold text-slate-400">{stats.pacientesInativos}</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-medium">Porcentagem</span>
                      <span className="font-bold text-slate-700">
                        {Math.round((stats.pacientesInativos / (stats.pacientesAtivos + stats.pacientesInativos || 1)) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bar Visualization */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 h-3 rounded-full overflow-hidden bg-slate-100">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-1000"
                    style={{
                      width: `${(stats.pacientesAtivos / (stats.pacientesAtivos + stats.pacientesInativos || 1)) * 100}%`,
                    }}
                  />
                  <div
                    className="h-full bg-gradient-to-r from-slate-400 to-slate-500 rounded-full transition-all duration-1000"
                    style={{
                      width: `${(stats.pacientesInativos / (stats.pacientesAtivos + stats.pacientesInativos || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Acesso Rápido</h3>
                <div className="space-y-2">
                  <Link
                    href="/pacientes"
                    className="group flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                      <span className="text-xs font-semibold text-slate-700">Gerenciar Pacientes</span>
                    </div>
                    <svg
                      className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  <Link
                    href={role === 'FUNCIONARIO' ? '/agenda-funcionario' : '/agenda'}
                    className="group flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <span className="text-xs font-semibold text-slate-700">Ver Agenda</span>
                    </div>
                    <svg
                      className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  <Link
                    href="/profissionais"
                    className="group flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                      </div>
                      <span className="text-xs font-semibold text-slate-700">Equipe</span>
                    </div>
                    <svg
                      className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* INFO BADGE */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-blue-900 mb-1">Dados em tempo real</h4>
                    <p className="text-[10px] text-blue-700 leading-relaxed">
                      As estatísticas são atualizadas automaticamente. Clique em "Atualizar" para forçar uma nova
                      sincronização.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
