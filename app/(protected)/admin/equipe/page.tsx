'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, ChevronDown, ChevronUp, Calendar, User, Briefcase } from 'lucide-react'

type StaffMember = {
  id: string
  nome: string
  profissao: string | null
  role: string | null
  data_nascimento?: string | null
  created_at?: string | null
}

type AvaliacaoRow = {
  id: string
  paciente_nome: string
  data_avaliacao: string
}

function formatDateBR(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function formatTimeBR(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mi}`
}

function calcAge(dateISO: string | null): string {
  if (!dateISO) return '—'
  const birth = new Date(dateISO)
  if (isNaN(birth.getTime())) return '—'
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return `${age} anos`
}

function StaffCard({
  member,
  isExpanded,
  onToggle,
  avaliacoes,
  loadingAvaliacoes,
}: {
  member: StaffMember
  isExpanded: boolean
  onToggle: () => void
  avaliacoes: AvaliacaoRow[]
  loadingAvaliacoes: boolean
}) {
  const roleLabel = member.role === 'ADMIN' ? 'Administrador' : 'Funcionário'
  const age = calcAge(member.data_nascimento ?? null)

  return (
    <div className="rounded-3xl border border-slate-200/60 bg-white/90 backdrop-blur-xl shadow-sm hover:shadow-md transition-all overflow-hidden">
      {/* Card Header - Clickable */}
      <button
        onClick={onToggle}
        className="w-full p-5 md:p-6 flex items-center gap-4 text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center shrink-0">
          <User className="h-6 w-6 text-purple-600" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{member.nome || 'Sem nome'}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
            {member.profissao && (
              <span className="flex items-center gap-1 text-xs text-slate-600">
                <Briefcase className="h-3 w-3" />
                {member.profissao}
              </span>
            )}
            <span className="text-xs text-slate-500">{age}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              {roleLabel}
            </span>
          </div>
        </div>

        <div className="shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded: Evaluation List */}
      {isExpanded && (
        <div className="border-t border-slate-200/60 bg-slate-50/40 p-5 md:p-6">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            Avaliações Realizadas
          </h4>

          {loadingAvaliacoes ? (
            <div className="flex items-center justify-center py-6">
              <div className="inline-flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-purple-500/70 animate-bounce"
                    style={{ animationDelay: `${i * 160}ms` }}
                  />
                ))}
              </div>
            </div>
          ) : avaliacoes.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
              Nenhuma avaliação registrada por este profissional.
            </p>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {avaliacoes.map((av) => (
                <div
                  key={av.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/60 hover:border-purple-200 transition-colors"
                >
                  <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{av.paciente_nome}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-slate-700">{formatDateBR(av.data_avaliacao)}</p>
                    {formatTimeBR(av.data_avaliacao) && (
                      <p className="text-[10px] text-slate-400">{formatTimeBR(av.data_avaliacao)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function EquipeAdminPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [staff, setStaff] = useState<StaffMember[]>([])

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [avaliacoesMap, setAvaliacoesMap] = useState<Record<string, AvaliacaoRow[]>>({})
  const [loadingAvaliacoes, setLoadingAvaliacoes] = useState<string | null>(null)

  useEffect(() => {
    loadStaff()
  }, [])

  async function loadStaff() {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (!userId) { setError('Sessão expirada.'); setLoading(false); return }

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('clinica_id')
        .eq('id', userId)
        .single()
      if (!myProfile?.clinica_id) { setError('Clínica não encontrada.'); setLoading(false); return }

      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, nome, role, profissao, data_nascimento, created_at')
        .eq('clinica_id', myProfile.clinica_id)
        .neq('is_master_admin', true)
        .in('role', ['ADMIN', 'FUNCIONARIO'])
        .eq('is_active', true)
        .order('nome', { ascending: true })

      if (err) throw err
      setStaff((data ?? []) as StaffMember[])
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar equipe')
    } finally {
      setLoading(false)
    }
  }

  async function loadAvaliacoes(profId: string) {
    if (avaliacoesMap[profId]) return // Already loaded

    setLoadingAvaliacoes(profId)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) return
      
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('clinica_id')
        .eq('id', userData.user.id)
        .single()
      
      let q = supabase
        .from('anamneses')
        .select('id, data_avaliacao, paciente_id, pacientes(nome)')
        .eq('profissional_id', profId)
        .order('data_avaliacao', { ascending: false })
        .limit(50)
      
      if (myProfile?.clinica_id) {
        q = (q as any).eq('clinica_id', myProfile.clinica_id)
      }
      
      const { data, error: err } = await q

      if (err) throw err

      const items: AvaliacaoRow[] = (data || []).map((a: any) => ({
        id: a.id,
        paciente_nome: a.pacientes?.nome || 'Paciente',
        data_avaliacao: a.data_avaliacao,
      }))

      setAvaliacoesMap((prev) => ({ ...prev, [profId]: items }))
    } catch (e) {
      console.error('[EquipeAdmin] Erro ao carregar avaliações:', e)
      setAvaliacoesMap((prev) => ({ ...prev, [profId]: [] }))
    } finally {
      setLoadingAvaliacoes(null)
    }
  }

  function handleToggle(profId: string) {
    if (expandedId === profId) {
      setExpandedId(null)
    } else {
      setExpandedId(profId)
      loadAvaliacoes(profId)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
        <div className="mx-auto max-w-5xl px-4 py-6 md:py-8">
          <div className="mb-8 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-slate-200 animate-pulse" />
            <div className="flex-1">
              <div className="h-7 w-56 bg-slate-200 rounded-lg animate-pulse mb-2" />
              <div className="h-4 w-80 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-3xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 pb-24 md:pb-8">
      <div className="mx-auto max-w-5xl px-4 py-6 md:py-8">
        {/* Header */}
        <div className="mb-8 sticky top-0 z-10 -mx-4 px-4 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="h-10 w-10 rounded-xl border border-slate-200/60 bg-white/90 backdrop-blur flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm hover:shadow"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Desempenho da Equipe</h1>
                  <p className="text-xs md:text-sm text-slate-600">Avaliações realizadas por cada profissional</p>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200">
              <span className="text-xs font-semibold text-purple-700">{staff.length} profissional{staff.length !== 1 ? 'is' : ''}</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Staff Cards */}
        {staff.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm text-slate-500">Nenhum profissional ativo encontrado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {staff.map((member) => (
              <StaffCard
                key={member.id}
                member={member}
                isExpanded={expandedId === member.id}
                onToggle={() => handleToggle(member.id)}
                avaliacoes={avaliacoesMap[member.id] || []}
                loadingAvaliacoes={loadingAvaliacoes === member.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
