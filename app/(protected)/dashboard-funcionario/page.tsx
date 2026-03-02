'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase, ensureValidSession } from '@/lib/supabaseClient'
import { clearAuthCookie } from '@/lib/authCookie'
import { Clock, Calendar, CheckCircle, Users, LayoutDashboard, ArrowLeft } from 'lucide-react'
import PageHeader from '@/components/ui/page-header'

type AgendamentoRow = {
  id: string
  data: string | null
  hora: string | null
  status: string | null
  tipo_servico: string | null
  modalidade: string | null
  pacientes?: { nome?: string | null } | null
}

function onlyTime(h: string | null) {
  if (!h) return '—'
  const parts = h.split(':')
  if (parts.length >= 2) return `${parts[0]}:${parts[1]}`
  return h
}

function formatBRDate(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function badgeStatusClass(status: string | null) {
  const s = (status || '').toUpperCase()
  if (s === 'CONFIRMADO') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (s === 'PENDENTE') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (s === 'REAGENDADO') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (s === 'CANCELADO' || s === 'RECUSADO') return 'border-rose-200 bg-rose-50 text-rose-700'
  if (s === 'REALIZADO') return 'border-purple-200 bg-purple-50 text-purple-700'
  return 'border-slate-200 bg-slate-50 text-slate-700'
}

function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-tight leading-none ${className}`}
    >
      {children}
    </span>
  )
}

function Card({
  title,
  right,
  children,
  id,
}: {
  title: string
  right?: React.ReactNode
  children?: React.ReactNode
  id?: string
}) {
  return (
    <div id={id} className="cp-card p-5 md:p-6 scroll-mt-28 md:scroll-mt-10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[12px] font-semibold tracking-wide text-slate-900">{title}</h3>
          <div className="mt-2 h-px w-full bg-slate-200/70" />
        </div>
        {right}
      </div>

      <div className="mt-4">{children}</div>
    </div>
  )
}

/** Polimento Max — bolinhas (IGUAL Agenda Polimento Max: 3 dots + bounce suave + delays 0/160/320) */
function AnimatedDots() {
  const dots = [
    { cls: 'bg-violet-500/80', delay: '0ms' },
    { cls: 'bg-sky-500/75', delay: '160ms' },
    { cls: 'bg-emerald-500/65', delay: '320ms' },
  ]
  return (
    <div className="mt-2 flex items-center gap-2">
      {dots.map((d, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${d.cls} animate-bounce shadow-[0_6px_18px_rgba(15,23,42,0.12)]`}
          style={{ animationDelay: d.delay }}
        />
      ))}
    </div>
  )
}

type MobileTab = 'proximos' | 'hoje' | 'pendentes'

export default function DashboardFuncionarioPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [proximos, setProximos] = useState<AgendamentoRow[]>([])
  const [hoje, setHoje] = useState<AgendamentoRow[]>([])
  const [pendentes, setPendentes] = useState<AgendamentoRow[]>([])
  const [userName, setUserName] = useState<string>('')

  // (mobile) refs para scroll suave nos 3 blocos
  const proxRef = useRef<HTMLDivElement | null>(null)
  const hojeRef = useRef<HTMLDivElement | null>(null)
  const pendRef = useRef<HTMLDivElement | null>(null)

  // (mobile) tab visual (somente UI)
  const [activeTab, setActiveTab] = useState<MobileTab>('proximos')

  async function load() {
    setLoading(true)
    setErro(null)
    try {
      // Garante sessão válida com refresh proativo antes de qualquer query
      const user = await ensureValidSession()
      if (!user) {
        clearAuthCookie()
        router.replace('/login')
        return
      }

      const { data: profile, error: perr } = await supabase
        .from('profiles')
        .select('id, role, is_active, nome')
        .eq('id', user.id)
        .single()

      if (perr || !profile?.is_active) {
        setErro('Usuário inativo ou sem permissão.')
        setLoading(false)
        return
      }

      // Extrair primeiro nome do usuário
      if (profile?.nome) {
        const firstName = profile.nome.split(' ')[0]
        setUserName(firstName)
      }

      const today = new Date()
      const todayIso = today.toISOString().split('T')[0]
      const baseSelect = 'id,data,hora,status,tipo_servico,modalidade,pacientes(nome)'

      const { data: prox } = await supabase
        .from('agendamentos')
        .select(baseSelect)
        .eq('profissional_id', user.id)
        .gte('data', todayIso)
        .order('data', { ascending: true })
        .limit(6)

      const { data: hj } = await supabase
        .from('agendamentos')
        .select(baseSelect)
        .eq('profissional_id', user.id)
        .eq('data', todayIso)
        .order('hora', { ascending: true })

      // mantive exatamente sua lógica (REALIZADO = “pendentes”), sem mudar funcionalidade
      const { data: pen } = await supabase
        .from('agendamentos')
        .select(baseSelect)
        .eq('profissional_id', user.id)
        .eq('status', 'REALIZADO')
        .order('data', { ascending: true })
        .limit(6)

      setProximos((prox || []) as AgendamentoRow[])
      setHoje((hj || []) as AgendamentoRow[])
      setPendentes((pen || []) as AgendamentoRow[])
    } catch {
      setErro('Erro ao carregar o dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const qtdHoje = useMemo(() => hoje.length, [hoje])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  // Polimento Max (tipografia interna limpa + mesma pegada do Dashboard)
  const itemRowClass =
    'flex items-start justify-between gap-3 rounded-[18px] border border-slate-200 bg-white/70 p-4 shadow-[0_10px_30px_rgba(18,18,28,0.06)] transition hover:bg-white hover:border-slate-300 hover:shadow-[0_16px_46px_rgba(18,18,28,0.10)]'
  const btnCriarEvolucao = 'cp-btn-primary px-4 py-2 text-[11px] font-semibold rounded-full'

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    const el = ref.current
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Polimento Max — pills (IGUAL Agenda: roxo via cp-btn-primary, sem “card extra” atrás)
  const mobilePillBase =
    'h-11 rounded-full px-4 text-[12px] font-semibold transition active:scale-[0.99] whitespace-nowrap'
  const mobilePillOn = 'cp-btn-primary'
  const mobilePillOff = 'cp-btn border border-slate-200 bg-white/70 text-slate-700 shadow-sm hover:bg-white'

  const goTab = (tab: MobileTab) => {
    setActiveTab(tab)
    if (tab === 'proximos') scrollTo(proxRef)
    if (tab === 'hoje') scrollTo(hojeRef)
    if (tab === 'pendentes') scrollTo(pendRef)
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* ── HEADER ÚNICO ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        <PageHeader
          icon={LayoutDashboard}
          title={`${getGreeting()}${userName ? `, ${userName}` : ''}`}
          subtitle="Veja o que temos para hoje"
          badge={{ text: 'Em Serviço', variant: 'success' }}
          showBackButton={true}
        />

        {loading && (
          <div className="mb-6">
            <AnimatedDots />
          </div>
        )}

        {erro && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200">
            <p className="text-sm text-rose-700">{erro}</p>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          MOBILE LAYOUT  (md:hidden)
         ════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden w-full px-4 space-y-6 pb-8">
        {/* ── Mobile Stats Pills ── */}
        <div className="flex flex-col gap-3">
          <div className="bg-white/80 backdrop-blur-md rounded-[32px] shadow-sm border border-slate-200/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600">Próximos</p>
                  <p className="text-xl font-bold text-slate-900">{proximos.length}</p>
                </div>
              </div>
              <button onClick={() => goTab('proximos')} className="text-xs text-purple-500 font-medium">
                Ver →
              </button>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-[32px] shadow-sm border border-slate-200/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600">Hoje</p>
                  <p className="text-xl font-bold text-slate-900">{qtdHoje}</p>
                </div>
              </div>
              <button onClick={() => goTab('hoje')} className="text-xs text-purple-500 font-medium">
                Ver →
              </button>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-[32px] shadow-sm border border-slate-200/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600">Pendentes</p>
                  <p className="text-xl font-bold text-slate-900">{pendentes.length}</p>
                </div>
              </div>
              <button onClick={() => goTab('pendentes')} className="text-xs text-purple-500 font-medium">
                Ver →
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile: Próximos ── */}
        <div ref={proxRef}>
          <div className="bg-white/80 backdrop-blur-md rounded-[32px] shadow-sm border border-slate-200/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Próximos Atendimentos</h3>
              <Badge className="border-purple-500 bg-purple-500 text-white">{proximos.length}</Badge>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="animate-pulse h-20 bg-slate-100 rounded-2xl" />
              ) : proximos.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">Nenhum atendimento futuro</p>
              ) : (
                proximos.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 truncate">{a.pacientes?.nome || 'Paciente'}</div>
                      <div className="text-xs text-slate-600 mt-1">{formatBRDate(a.data)} <span className="text-slate-300">•</span> {onlyTime(a.hora)}</div>
                    </div>
                    <Badge className={badgeStatusClass(a.status)}>{a.status || '—'}</Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Mobile: Hoje ── */}
        <div ref={hojeRef}>
          <div className="bg-white/80 backdrop-blur-md rounded-[32px] shadow-sm border border-slate-200/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Agenda de Hoje</h3>
              <Badge className="border-purple-500 bg-purple-500 text-white">{qtdHoje}</Badge>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="animate-pulse h-20 bg-slate-100 rounded-2xl" />
              ) : hoje.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">Agenda vazia para hoje</p>
              ) : (
                hoje.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 truncate">{a.pacientes?.nome || 'Paciente'}</div>
                      <div className="text-xs text-slate-600 mt-1">{onlyTime(a.hora)}</div>
                    </div>
                    <Badge className={badgeStatusClass(a.status)}>{a.status || '—'}</Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Mobile: Evoluções Pendentes ── */}
        <div ref={pendRef}>
          <div className="bg-white/80 backdrop-blur-md rounded-[32px] shadow-sm border border-slate-200/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Evoluções Pendentes</h3>
              <Badge className="border-purple-500 bg-purple-500 text-white">{pendentes.length}</Badge>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="animate-pulse h-20 bg-slate-100 rounded-2xl" />
              ) : pendentes.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">Tudo em dia!</p>
              ) : (
                pendentes.map((a) => (
                  <div key={a.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/70 p-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{a.pacientes?.nome || 'Paciente'}</div>
                      <div className="text-xs text-slate-600 mt-1">{formatBRDate(a.data)}</div>
                    </div>
                    <Link
                      href={`/evolucoes/minhas?agendamento=${a.id}`}
                      className="w-full h-12 text-base font-bold bg-purple-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition inline-flex items-center justify-center"
                    >
                      Criar evolução
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      {/* ── FIM MOBILE ── */}

      {/* ════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (hidden md:block)
         ════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:block max-w-6xl mx-auto px-4 pb-12">
        {/* ── Desktop Stats Grid — 3 colunas ── */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-md rounded-[32px] shadow-sm border border-slate-200/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-600">Próximos Atendimentos</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{proximos.length}</p>
            <p className="text-xs text-slate-500 mt-1">agendamentos futuros</p>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-[32px] shadow-sm border border-slate-200/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-600">Agenda de Hoje</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{qtdHoje}</p>
            <p className="text-xs text-slate-500 mt-1">atendimentos hoje</p>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-[32px] shadow-sm border border-slate-200/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-600">Evoluções Pendentes</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{pendentes.length}</p>
            <p className="text-xs text-slate-500 mt-1">aguardando registro</p>
          </div>
        </div>

        {/* ── Desktop Table Grid — 3 colunas ── */}
        <div className="grid grid-cols-3 gap-6">
          {/* Próximos */}
          <div className="bg-white/80 backdrop-blur-md rounded-[32px] shadow-sm border border-slate-200/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Próximos Atendimentos</h3>
              <Badge className="border-purple-500 bg-purple-500 text-white">{proximos.length}</Badge>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="animate-pulse h-20 bg-slate-100 rounded-2xl" />
              ) : proximos.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">Nenhum atendimento futuro</p>
              ) : (
                proximos.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 hover:bg-white hover:border-slate-300 transition">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 truncate">{a.pacientes?.nome || 'Paciente'}</div>
                      <div className="text-xs text-slate-600 mt-1">{formatBRDate(a.data)} <span className="text-slate-300">•</span> {onlyTime(a.hora)}</div>
                    </div>
                    <Badge className={badgeStatusClass(a.status)}>{a.status || '—'}</Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Hoje */}
          <div className="bg-white/80 backdrop-blur-md rounded-[32px] shadow-sm border border-slate-200/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Agenda de Hoje</h3>
              <Badge className="border-purple-500 bg-purple-500 text-white">{qtdHoje}</Badge>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="animate-pulse h-20 bg-slate-100 rounded-2xl" />
              ) : hoje.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">Agenda vazia para hoje</p>
              ) : (
                hoje.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 hover:bg-white hover:border-slate-300 transition">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 truncate">{a.pacientes?.nome || 'Paciente'}</div>
                      <div className="text-xs text-slate-600 mt-1">{onlyTime(a.hora)}</div>
                    </div>
                    <Badge className={badgeStatusClass(a.status)}>{a.status || '—'}</Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Evoluções pendentes */}
          <div className="bg-white/80 backdrop-blur-md rounded-[32px] shadow-sm border border-slate-200/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Evoluções Pendentes</h3>
              <Badge className="border-purple-500 bg-purple-500 text-white">{pendentes.length}</Badge>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="animate-pulse h-20 bg-slate-100 rounded-2xl" />
              ) : pendentes.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">Tudo em dia!</p>
              ) : (
                pendentes.map((a) => (
                  <div key={a.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 hover:bg-white hover:border-slate-300 transition">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{a.pacientes?.nome || 'Paciente'}</div>
                      <div className="text-xs text-slate-600 mt-1">{formatBRDate(a.data)}</div>
                    </div>
                    <Link
                      href={`/evolucoes/minhas?agendamento=${a.id}`}
                      className="w-fit px-6 h-12 text-xs font-bold bg-purple-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition inline-flex items-center justify-center"
                    >
                      Criar evolução
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      {/* ── FIM DESKTOP ── */}
    </div>
  )
}