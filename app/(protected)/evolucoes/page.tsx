'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import PageHeader from '@/components/ui/page-header'
import { FileText, Trash2 } from 'lucide-react'

/* =========================
   TIPAGENS — INTACTAS
========================= */
type PerfilMini = {
  id: string
  nome: string | null
  profissao: string | null
  registro_tipo: string | null
  registro_numero: string | null
  role: 'ADMIN' | 'FUNCIONARIO'
  is_active?: boolean | null
}

type PacienteMini = {
  id: string
  nome: string
  data_nascimento: string | null
  plano_pagamento: string | null
  plano_pagamento_outro: string | null
  convenio: string | null
  convenio_outro: string | null
}

type Evolucao = {
  id: string
  paciente_id: string
  profissional_id: string
  agendamento_id: string | null
  texto_original: string | null
  texto_melhorado_ia: string | null
  data_hora: string
}

type View =
  | { level: 'profissionais' }
  | { level: 'pacientes'; profissionalId: string }
  | { level: 'evolucoes'; profissionalId: string; pacienteId: string }

type SearchHit =
  | { kind: 'prof'; profissionalId: string; total: number }
  | { kind: 'pac'; profissionalId: string; pacienteId: string; total: number }

/* =========================
   HELPERS — INTACTOS
========================= */
function formatDateTimeBR(iso: string) {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} às ${hh}:${mi}`
}

function formatDateBR(yyyyMmDd: string) {
  const [y, m, d] = yyyyMmDd.split('-')
  return `${d}/${m}/${y}`
}

function clip(text: string, n = 160) {
  const t = (text || '').trim()
  if (!t) return ''
  return t.length > n ? t.slice(0, n).trimEnd() + '…' : t
}

function planoLabel(p: PacienteMini | undefined) {
  if (!p) return ''
  const base = p.plano_pagamento ?? ''
  if (!base) return ''
  if (base === 'Outro') return p.plano_pagamento_outro ? `Plano: ${p.plano_pagamento_outro}` : 'Plano: Outro'
  return `Plano: ${base}`
}

function adminFinalText(e: Evolucao) {
  const orig = (e.texto_original ?? '').trim()
  if (orig) return orig
  return (e.texto_melhorado_ia ?? '').trim()
}

// Ícones SVG inline (minimalistas)
const FileTextIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const ClockIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const UserIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const UsersIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const ChevronLeftIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
)

const SearchIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const XIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const ChevronDownIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
)

export default function EvolucoesAdminPage() {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [view, setView] = useState<View>({ level: 'profissionais' })
  const viewRef = useRef<View>(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])

  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([])
  const [profissionaisMap, setProfissionaisMap] = useState<Record<string, PerfilMini>>({})
  const [pacientesMap, setPacientesMap] = useState<Record<string, PacienteMini>>({})

  const [q, setQ] = useState('')

  async function carregar() {
    try {
      setErro(null)

      // Obter clinica_id para isolamento multitenancy
      const { data: s } = await supabase.auth.getSession()
      const userId = s.session?.user?.id
      if (!userId) { setErro('Sessão expirada.'); return }
      const { data: myProfile } = await supabase
        .from('profiles').select('clinica_id').eq('id', userId).single()

      const { data: evoData, error: evoErr } = await supabase
        .from('evolucoes_clinicas')
        .select('*')
        .eq('clinica_id', myProfile?.clinica_id)
        .order('data_hora', { ascending: false })

      if (evoErr) throw evoErr

      const evos = (evoData ?? []) as Evolucao[]
      setEvolucoes(evos)

      const profIds = Array.from(new Set(evos.map((e) => e.profissional_id))).filter(Boolean)
      if (profIds.length > 0) {
        const { data: profData } = await supabase.from('profiles').select('*').in('id', profIds)
        const map: Record<string, PerfilMini> = {}
        profData?.forEach((p: any) => (map[p.id] = p))
        setProfissionaisMap(map)
      } else {
        setProfissionaisMap({})
      }

      const pacIds = Array.from(new Set(evos.map((e) => e.paciente_id))).filter(Boolean)
      if (pacIds.length > 0) {
        const { data: pacData } = await supabase.from('pacientes').select('*').in('id', pacIds)
        const map: Record<string, PacienteMini> = {}
        pacData?.forEach((p: any) => (map[p.id] = p))
        setPacientesMap(map)
      } else {
        setPacientesMap({})
      }
    } catch (e: any) {
      setErro(e?.message || 'Erro ao carregar.')
    }
  }

  useEffect(() => {
    let alive = true
    async function boot() {
      setLoading(true)
      await carregar()
      if (!alive) return
      setLoading(false)
    }
    boot()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      carregar()
    }, 180_000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const profCount = useMemo(() => {
    const count: Record<string, number> = {}
    for (const e of evolucoes) count[e.profissional_id] = (count[e.profissional_id] ?? 0) + 1
    return count
  }, [evolucoes])

  const pacienteCountByProf = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of evolucoes) {
      const k = `${e.profissional_id}:${e.paciente_id}`
      map.set(k, (map.get(k) ?? 0) + 1)
    }
    return map
  }, [evolucoes])

  const searchHits = useMemo((): SearchHit[] => {
    const query = q.trim().toLowerCase()
    if (!query) return []

    const hits: SearchHit[] = []

    for (const [profId, total] of Object.entries(profCount)) {
      const prof = profissionaisMap[profId]
      if (prof?.role !== 'FUNCIONARIO') continue
      const nome = (prof?.nome ?? '').toLowerCase()
      if (nome && nome.includes(query)) hits.push({ kind: 'prof', profissionalId: profId, total })
    }

    const seen = new Set<string>()
    for (const e of evolucoes) {
      const p = pacientesMap[e.paciente_id]
      const pNome = (p?.nome ?? '').toLowerCase()
      if (!pNome || !pNome.includes(query)) continue
      const key = `${e.profissional_id}:${e.paciente_id}`
      if (seen.has(key)) continue
      seen.add(key)
      const total = pacienteCountByProf.get(key) ?? 0
      hits.push({ kind: 'pac', profissionalId: e.profissional_id, pacienteId: e.paciente_id, total })
    }

    hits.sort((a, b) => {
      const ak = a.kind === 'prof' ? 0 : 1
      const bk = b.kind === 'prof' ? 0 : 1
      if (ak !== bk) return ak - bk
      const at = a.total
      const bt = b.total
      if (bt !== at) return bt - at

      const aName =
        a.kind === 'prof'
          ? (profissionaisMap[a.profissionalId]?.nome ?? '')
          : (pacientesMap[a.pacienteId]?.nome ?? '')
      const bName =
        b.kind === 'prof'
          ? (profissionaisMap[b.profissionalId]?.nome ?? '')
          : (pacientesMap[b.pacienteId]?.nome ?? '')

      return aName.localeCompare(bName)
    })

    return hits.slice(0, 30)
  }, [q, evolucoes, profCount, profissionaisMap, pacientesMap, pacienteCountByProf])

  const profissionaisList = useMemo(() => {
    const items = Object.keys(profCount)
      .map((id) => ({ id, total: profCount[id], prof: profissionaisMap[id] }))
      .filter((x) => x.prof?.role === 'FUNCIONARIO')
    items.sort((a, b) => b.total - a.total || (a.prof?.nome ?? '').localeCompare(b.prof?.nome ?? ''))
    return items
  }, [profCount, profissionaisMap])

  const pacientesDoProfissional = useMemo(() => {
    if (view.level !== 'pacientes') return []
    const profId = view.profissionalId

    const setPac = new Set<string>()
    for (const e of evolucoes) if (e.profissional_id === profId) setPac.add(e.paciente_id)

    const items = Array.from(setPac).map((pid) => ({
      id: pid,
      paciente: pacientesMap[pid],
      total: pacienteCountByProf.get(`${profId}:${pid}`) ?? 0,
    }))

    const query = q.trim().toLowerCase()
    const filtered = query ? items.filter((x) => (x.paciente?.nome ?? '').toLowerCase().includes(query)) : items
    filtered.sort((a, b) => b.total - a.total || (a.paciente?.nome ?? '').localeCompare(b.paciente?.nome ?? ''))
    return filtered
  }, [view, evolucoes, pacientesMap, q, pacienteCountByProf])

  const evolucoesDoPaciente = useMemo(() => {
    if (view.level !== 'evolucoes') return []
    return evolucoes
      .filter((e) => e.profissional_id === view.profissionalId && e.paciente_id === view.pacienteId)
      .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())
  }, [view, evolucoes])

  const profAtual = view.level !== 'profissionais' ? profissionaisMap[view.profissionalId] : null
  const pacienteAtual = view.level === 'evolucoes' ? pacientesMap[view.pacienteId] : null

  const headerH1 =
    view.level === 'profissionais' ? 'Evoluções' : view.level === 'pacientes' ? 'Pacientes' : 'Timeline'
  const headerP =
    view.level === 'profissionais'
      ? 'Evoluções organizadas por funcionário e paciente'
      : view.level === 'pacientes'
      ? 'Evoluções agrupadas por paciente'
      : 'Histórico completo de atendimentos'

  const canGoBack = view.level !== 'profissionais'
  const backTo: View =
    view.level === 'evolucoes'
      ? { level: 'pacientes', profissionalId: view.profissionalId }
      : { level: 'profissionais' }

  const showSearch = view.level !== 'evolucoes'
  const searchPlaceholder = 'Buscar profissional ou paciente...'

  // Função de exclusão de funcionário
  async function handleDeleteProfile(id: string) {
    if (!confirm('Tem certeza que deseja excluir este funcionário e seus registros?')) return
    
    setLoading(true)
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id)
      if (error) throw error
      await carregar()
    } catch (e: any) {
      alert('Erro ao excluir: ' + e.message)
      setLoading(false)
    }
  }

  // Função de exclusão de paciente
  async function handleDeletePaciente(id: string) {
    if (!confirm('Tem certeza que deseja excluir este paciente e seus registros?')) return
    
    setLoading(true)
    try {
      const { error } = await supabase.from('pacientes').delete().eq('id', id)
      if (error) throw error
      await carregar()
    } catch (e: any) {
      alert('Erro ao excluir: ' + e.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <PageHeader
          icon={FileText}
          title={headerH1}
          subtitle={headerP}
        />

        {/* Badges do contexto atual */}
        {(profAtual || pacienteAtual) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {profAtual && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200">
                <UsersIcon className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs font-semibold text-purple-700">
                  {profAtual.nome}
                  {profAtual.profissao && <span className="text-purple-500/70"> • {profAtual.profissao}</span>}
                </span>
              </div>
            )}
            {pacienteAtual && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
                <UserIcon className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-xs font-semibold text-slate-700">
                  {pacienteAtual.nome}
                  {pacienteAtual.data_nascimento && (
                    <span className="text-slate-500"> • Nasc: {formatDateBR(pacienteAtual.data_nascimento)}</span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {canGoBack && (
          <button
            type="button"
            onClick={() => setView(backTo)}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold transition-all active:scale-95"
          >
            <ChevronLeftIcon className="w-3.5 h-3.5" />
            Voltar
          </button>
        )}

        {erro && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        {/* Container Principal */}
        <div className="mt-6 space-y-6">
        {/* Busca */}
        {showSearch && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
              <SearchIcon className="w-3.5 h-3.5 inline mr-1.5 opacity-60" />
              Buscar
            </label>
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full px-4 py-2.5 pl-10 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                placeholder={searchPlaceholder}
              />
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  <XIcon className="w-3.5 h-3.5 text-slate-600" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Conteúdo */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-100 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : view.level === 'profissionais' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(q.trim() ? searchHits : []).length > 0
              ? searchHits.map((hit, idx) => {
                  if (hit.kind === 'prof') {
                    const prof = profissionaisMap[hit.profissionalId]
                    return (
                      <button
                        key={`hit-prof-${hit.profissionalId}-${idx}`}
                        type="button"
                        onClick={() => setView({ level: 'pacientes', profissionalId: hit.profissionalId })}
                        className="group relative bg-white rounded-xl p-5 shadow-sm hover:shadow-md border border-slate-100 hover:border-purple-200/60 hover:-translate-y-0.5 transition-all duration-200 text-left"
                      >
                        <div 
                          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors z-10"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteProfile(hit.profissionalId)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </div>

                        <div className="flex items-start gap-4">
                          <div className="shrink-0 w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                            <UsersIcon className="w-6 h-6 text-purple-500" />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col space-y-1">
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Funcionário
                            </div>
                            <h3 className="text-base font-bold text-slate-900 truncate">{prof?.nome || 'Funcionário'}</h3>
                            <p className="text-xs text-slate-600">{prof?.profissao || 'Profissão'}</p>
                          </div>
                        </div>
                      </button>
                    )
                  }

                  const prof = profissionaisMap[hit.profissionalId]
                  const pac = pacientesMap[hit.pacienteId]

                  return (
                    <button
                      key={`hit-pac-${hit.profissionalId}-${hit.pacienteId}-${idx}`}
                      type="button"
                      onClick={() =>
                        setView({ level: 'evolucoes', profissionalId: hit.profissionalId, pacienteId: hit.pacienteId })
                      }
                      className="group relative bg-white rounded-xl p-5 shadow-sm hover:shadow-md border border-slate-100 hover:border-purple-200/60 hover:-translate-y-0.5 transition-all duration-200 text-left"
                    >
                      <div 
                        className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors z-10"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePaciente(hit.pacienteId)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col space-y-1">
                          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Paciente
                          </div>
                          <h3 className="text-base font-bold text-slate-900 truncate">{pac?.nome || 'Paciente'}</h3>
                          <p className="text-xs text-slate-600">
                            {pac?.data_nascimento ? `Nasc: ${formatDateBR(pac.data_nascimento)}` : 'Sem data'}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            Prof.: {prof?.nome || 'Profissional'}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })
              : profissionaisList.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setView({ level: 'pacientes', profissionalId: item.id })}
                    className="group relative bg-white rounded-xl p-5 shadow-sm hover:shadow-md border border-slate-100 hover:border-purple-200/60 hover:-translate-y-0.5 transition-all duration-200 text-left"
                  >
                    <div 
                      className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors z-10"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteProfile(item.id)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="shrink-0 w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                        <UsersIcon className="w-6 h-6 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col space-y-1">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Funcionário
                        </div>
                        <h3 className="text-base font-bold text-slate-900 truncate">{item.prof?.nome || 'Funcionário'}</h3>
                        <p className="text-xs text-slate-600">{item.prof?.profissao || 'Profissão'}</p>
                      </div>
                    </div>
                  </button>
                ))}
          </div>
        ) : view.level === 'pacientes' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pacientesDoProfissional.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView({ level: 'evolucoes', profissionalId: view.profissionalId, pacienteId: item.id })}
                className="group relative bg-white rounded-xl p-5 shadow-sm hover:shadow-md border border-slate-100 hover:border-purple-200/60 hover:-translate-y-0.5 transition-all duration-200 text-left"
              >
                <div 
                  className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors z-10"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeletePaciente(item.id)
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </div>

                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Paciente
                    </div>
                    <h3 className="text-base font-bold text-slate-900 truncate">{item.paciente?.nome || 'Paciente'}</h3>
                    <p className="text-xs text-slate-600">
                      {item.paciente?.data_nascimento ? `Nasc: ${formatDateBR(item.paciente.data_nascimento)}` : 'Sem data'}
                    </p>
                    {planoLabel(item.paciente) && (
                      <p className="text-xs text-slate-500 truncate">{planoLabel(item.paciente)}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* TIMELINE VERTICAL DE EVOLUÇÕES */
          <div className="max-w-4xl mx-auto">
            {evolucoesDoPaciente.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
                <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-4">
                  <FileTextIcon className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-900 mb-1">Nenhuma evolução encontrada</p>
                <p className="text-xs text-slate-500">Comece registrando a primeira sessão do paciente</p>
              </div>
            ) : (
              <div className="relative">
                {/* Linha vertical da timeline */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-200 via-slate-200 to-transparent" />

                {/* Cards de evolução */}
                <div className="space-y-6">
                  {evolucoesDoPaciente.map((e, idx) => {
                    const finalText = adminFinalText(e)
                    const isLast = idx === evolucoesDoPaciente.length - 1

                    return (
                      <div key={e.id} className="relative pl-16">
                        {/* Dot na timeline */}
                        <div className="absolute left-3 top-6 w-6 h-6 rounded-full bg-white border-4 border-purple-500 shadow-lg shadow-purple-400/30 z-10" />

                        {/* Card da evolução */}
                        <div className="group bg-white rounded-xl shadow-sm hover:shadow-md border border-slate-100 hover:border-purple-200 transition-all duration-200 overflow-hidden">
                          <div className="p-6">
                            {/* Meta (Data/Hora) */}
                            <div className="flex items-center gap-2 mb-4">
                              <ClockIcon className="w-4 h-4 text-slate-400" />
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                {formatDateTimeBR(e.data_hora)}
                              </span>
                            </div>

                            {/* Texto preview */}
                            <p className="text-sm text-slate-700 leading-relaxed">
                              {clip(finalText, 180) || 'Sem texto registrado.'}
                            </p>

                            {/* Expandir texto completo */}
                            {finalText && (
                              <details className="mt-4 group/details">
                                <summary className="cursor-pointer list-none text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-2 transition-colors">
                                  <ChevronDownIcon className="w-4 h-4 group-open/details:rotate-180 transition-transform" />
                                  Ver completo
                                </summary>

                                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-5">
                                  <div className="flex items-center gap-2 mb-3">
                                    <FileTextIcon className="w-3.5 h-3.5 text-slate-500" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                      Registro Completo
                                    </span>
                                  </div>
                                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                    {finalText}
                                  </div>
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
