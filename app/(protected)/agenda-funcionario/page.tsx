'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import PageHeader from '@/components/ui/page-header'
import { Calendar, RefreshCw, Clock, CheckCircle, History, AlertCircle } from 'lucide-react'

// --- Tipagens e Helpers (Preservados com Rigor) ---
type Role = 'ADMIN' | 'FUNCIONARIO' | 'CRIADOR' | null
type AgendamentoStatus =
  | 'PENDENTE'
  | 'CONFIRMADO'
  | 'RECUSADO'
  | 'CANCELADO_ADMIN'
  | 'CANCELADO_FUNCIONARIO'
  | 'REALIZADO'

type AgendamentoRow = {
  id: string
  paciente_id: string | null
  profissional_id: string | null
  data: string | null
  hora: string | null
  status: AgendamentoStatus | null
  tipo_servico: string | null
  tipo_servico_outro: string | null
  modalidade: string | null
  observacoes: string | null
  motivo_cancelamento: string | null
  motivo_remarcacao: string | null
  motivo_recusa: string | null
  updated_at: string | null
  updated_by_role: Role
  paciente?: { nome: string | null; convenio?: string | null; convenio_outro?: string | null } | null
}

const formatBRDate = (iso: string | null) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const formatHora = (h: string | null) => (h ? h.slice(0, 5) : '—')

// Skeleton Loading Component
const SkeletonCard = () => (
  <div className={`rounded-[32px] bg-white/80 backdrop-blur-md border border-white/20 shadow-xl overflow-hidden p-5 mb-4 animate-pulse`}>
    <div className="flex justify-between items-start mb-4 gap-3">
      <div className="flex-1">
        <div className="h-4 bg-slate-200 rounded-lg w-3/4 mb-2"></div>
        <div className="h-3 bg-slate-100 rounded-lg w-1/2"></div>
      </div>
      <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
    </div>
    <div className="grid grid-cols-2 gap-3 mb-5 p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
      <div>
        <div className="h-2 bg-slate-100 rounded w-16 mb-1"></div>
        <div className="h-3 bg-slate-200 rounded w-20"></div>
      </div>
      <div>
        <div className="h-2 bg-slate-100 rounded w-16 mb-1"></div>
        <div className="h-3 bg-slate-200 rounded w-20"></div>
      </div>
    </div>
    <div className="flex gap-3">
      <div className="flex-1 h-12 bg-slate-200 rounded-2xl"></div>
      <div className="flex-1 h-12 bg-slate-100 rounded-2xl"></div>
    </div>
  </div>
)

const isFuture = (dataIso: string | null, hora: string | null) => {
  if (!dataIso) return false
  const dt = new Date(`${dataIso}T${(hora || '00:00').slice(0, 5)}:00`)
  return dt.getTime() >= Date.now() - 60_000
}

const badgeClasses = (status: AgendamentoStatus | null) => {
  switch (status) {
    case 'CONFIRMADO':
      return 'bg-emerald-50 text-emerald-600 border-emerald-100'
    case 'PENDENTE':
      return 'bg-amber-50 text-amber-600 border-amber-100'
    case 'REALIZADO':
      return 'bg-purple-50 text-purple-600 border-purple-100'
    default:
      return 'bg-rose-50 text-rose-600 border-rose-100'
  }
}

type MobileTab = 'PENDENTES' | 'CONFIRMADOS' | 'HISTORICO'

export default function AgendaFuncionarioPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [lista, setLista] = useState<AgendamentoRow[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'remarcar' | 'cancelar' | null>(null)
  const [selected, setSelected] = useState<AgendamentoRow | null>(null)
  const [novaData, setNovaData] = useState('')
  const [novaHora, setNovaHora] = useState('')
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({ all: true })
  const [mobileTab, setMobileTab] = useState<MobileTab>('PENDENTES')
  const inFlightRef = useRef(false)

  async function load(opts?: { silent?: boolean }) {
    if (inFlightRef.current) return
    inFlightRef.current = true
    if (!opts?.silent) {
      setLoading(true)
      setErro(null)
    }
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        setLista([])
        return
      }
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*, paciente:pacientes(nome,convenio,convenio_outro)')
        .eq('profissional_id', auth.user.id)
        .order('data', { ascending: true })
        .order('hora', { ascending: true })

      if (error) setErro(error.message)
      else setLista((data || []) as any)
    } finally {
      setLoading(false)
      inFlightRef.current = false
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(() => {
      if (!saving) load({ silent: true })
    }, 60000)
    return () => clearInterval(interval)
  }, [saving])

  const pendentes = useMemo(() => lista.filter((a) => a.status === 'PENDENTE'), [lista])
  const confirmados = useMemo(
    () => lista.filter((a) => isFuture(a.data, a.hora) && a.status === 'CONFIRMADO'),
    [lista]
  )
  const finalizados = useMemo(
    () =>
      lista.filter(
        (a) => a.status === 'REALIZADO' || (a.status === 'CONFIRMADO' && !isFuture(a.data, a.hora))
      ),
    [lista]
  )

  const finalizadosByMonth = useMemo(() => {
    const map: Record<string, AgendamentoRow[]> = {}
    finalizados.forEach((a) => {
      const key = a.data?.slice(0, 7) || 'Sem data'
      if (!map[key]) map[key] = []
      map[key].push(a)
    })
    return { map, keys: Object.keys(map).sort().reverse() }
  }, [finalizados])

  const handleAction = async (id: string, payload: any) => {
    setSaving(true)
    const { error } = await supabase
      .from('agendamentos')
      .update({ ...payload, updated_at: new Date().toISOString(), updated_by_role: 'FUNCIONARIO' })
      .eq('id', id)

    if (error) setErro(error.message)
    else await load({ silent: true })
    setSaving(false)
  }

  // --- Styles de Luxo & Consistência (MÉTODO 1 MILHÃO) ---
  const luxuryCard = 'rounded-[32px] bg-white/80 backdrop-blur-md border border-white/20 shadow-xl transition-all hover:shadow-2xl overflow-hidden'
  const luxuryBtnPrimary = 'h-12 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-2xl shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all flex items-center justify-center'
  const luxuryBtnSecondary = 'h-12 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 rounded-2xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center'
  const pillTabBase = 'h-10 px-4 rounded-full text-xs font-bold transition-all border whitespace-nowrap'
  const pillTabActive = 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/20'
  const pillTabInactive = 'bg-white text-slate-600 border-slate-200 hover:border-purple-200'

  const showPendentes = mobileTab === 'PENDENTES'
  const showConfirmados = mobileTab === 'CONFIRMADOS'
  const showHistorico = mobileTab === 'HISTORICO'

  // Componente de Card Reutilizável
  const AgendamentoCard = ({ a, actions = true }: { a: AgendamentoRow, actions?: boolean }) => (
    <div className={`${luxuryCard} p-5 mb-4`}>
      <div className="flex justify-between items-start mb-4 gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900 truncate">
            {a.paciente?.nome}
          </h3>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {formatBRDate(a.data)}
            <span className="text-slate-300">•</span>
            <Clock className="w-3.5 h-3.5" />
            {formatHora(a.hora)}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${badgeClasses(
            a.status
          )}`}
        >
          {a.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5 p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Convênio</p>
          <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">
            {a.paciente?.convenio === 'Outro'
              ? a.paciente?.convenio_outro
              : a.paciente?.convenio || 'Particular'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modalidade</p>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">
            {a.modalidade || 'Presencial'}
          </p>
        </div>
      </div>

      {actions && (
        <div className="flex gap-3">
          {a.status === 'PENDENTE' && (
            <>
              <button
                onClick={() => handleAction(a.id, { status: 'CONFIRMADO' })}
                className={`${luxuryBtnPrimary} flex-1 text-xs`}
              >
                Confirmar
              </button>
              <button
                onClick={() => {
                  setSelected(a)
                  setModalType('cancelar')
                  setModalOpen(true)
                }}
                className={`${luxuryBtnSecondary} flex-1 text-xs`}
              >
                Recusar
              </button>
            </>
          )}
          {a.status === 'CONFIRMADO' && (
            <>
              <button
                onClick={() => handleAction(a.id, { status: 'REALIZADO' })}
                className={`${luxuryBtnPrimary} flex-1 text-xs`}
              >
                Finalizar
              </button>
              <button
                onClick={() => {
                  setSelected(a)
                  setModalType('remarcar')
                  setNovaData(a.data || '')
                  setNovaHora((a.hora || '').slice(0, 5))
                  setModalOpen(true)
                }}
                className={`${luxuryBtnSecondary} w-12 flex-none !px-0`}
                title="Remarcar"
              >
                📅
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F1F5F9] pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* HEADER DE LUXO PADRONIZADO */}
        <PageHeader 
          title="Agenda" 
          subtitle="Gerencie seus horários e confirmações"
          icon={Calendar}
          showBackButton={true}
          action={
            <button
              onClick={() => load()}
              disabled={loading}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 shadow-sm hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          }
        />

        {erro && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{erro}</span>
          </div>
        )}

        {/* LAYOUT GRID (Desktop: 12 colunas | Mobile: Flex Column) */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-8">
          
          {/* SIDEBAR (Desktop: col-span-4) - Pendentes & Ações */}
          <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
            
            {/* MOBILE TABS (Apenas Mobile) - Sticky com shadow */}
            <div className="md:hidden sticky top-0 z-10 bg-[#F1F5F9] pb-3 -mx-4 px-4 mb-4">
              <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button onClick={() => setMobileTab('PENDENTES')} className={`${pillTabBase} ${showPendentes ? pillTabActive : pillTabInactive}`}>
                Pendentes ({pendentes.length})
              </button>
              <button onClick={() => setMobileTab('CONFIRMADOS')} className={`${pillTabBase} ${showConfirmados ? pillTabActive : pillTabInactive}`}>
                Confirmados ({confirmados.length})
              </button>
              <button onClick={() => setMobileTab('HISTORICO')} className={`${pillTabBase} ${showHistorico ? pillTabActive : pillTabInactive}`}>
                Histórico ({finalizados.length})
              </button>
              </div>
            </div>

            {/* CONTEÚDO PENDENTES (Desktop: Sempre visível | Mobile: Controlado por Tab) */}
            <div className={`${!showPendentes ? 'hidden lg:block' : 'block'}`}>
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Pendentes
                </h3>
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  {pendentes.length}
                </span>
              </div>
              
              <div className="space-y-4">
                {loading ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : pendentes.length === 0 ? (
                  <div className={`${luxuryCard} p-8 text-center`}>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-amber-400" />
                    </div>
                    <p className="text-sm text-slate-900 font-semibold mb-1">Nenhum agendamento pendente</p>
                    <p className="text-xs text-slate-500">Novos agendamentos aparecerão aqui</p>
                  </div>
                ) : (
                  pendentes.map(a => <AgendamentoCard key={a.id} a={a} />)
                )}
              </div>
            </div>
          </div>

          {/* MAIN CONTENT (Desktop: col-span-8) - Confirmados & Histórico */}
          <div className="lg:col-span-8 space-y-8 order-1 lg:order-2">
            
            {/* CONFIRMADOS */}
            <div className={`${!showConfirmados ? 'hidden lg:block' : 'block'}`}>
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Próximos Atendimentos
                </h3>
                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  {confirmados.length}
                </span>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : confirmados.length === 0 ? (
                  <div className={`${luxuryCard} p-8 text-center`}>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-50 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-emerald-400" />
                    </div>
                    <p className="text-sm text-slate-900 font-semibold mb-1">Nenhum atendimento confirmado</p>
                    <p className="text-xs text-slate-500">Confirme agendamentos pendentes para vê-los aqui</p>
                  </div>
                ) : (
                  confirmados.map(a => <AgendamentoCard key={a.id} a={a} />)
                )}
              </div>
            </div>

            {/* HISTÓRICO */}
            <div className={`${!showHistorico ? 'hidden lg:block' : 'block'}`}>
              <div className={`${luxuryCard} overflow-hidden`}>
                 <button
                  onClick={() => setOpenMonths((prev) => ({ ...prev, all: !prev.all }))}
                  className="w-full p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                      <History className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-lg font-bold text-slate-900">Histórico</h2>
                      <p className="text-xs text-slate-500">Atendimentos concluídos</p>
                    </div>
                  </div>
                  <div className={`transition-transform duration-300 ${openMonths.all ? 'rotate-180' : ''} text-slate-300`}>
                    ⌄
                  </div>
                </button>

                {openMonths.all && (
                  <div className="px-6 pb-6 space-y-6">
                    {finalizadosByMonth.keys.map((k) => (
                      <div key={k} className="border-t border-slate-100 pt-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">{k}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {finalizadosByMonth.map[k].map((a) => (
                            <div key={a.id} className="bg-slate-50/50 border border-slate-200/60 p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all">
                              <div className="flex justify-between items-start mb-2 gap-2">
                                <p className="text-slate-900 font-bold text-sm truncate">{a.paciente?.nome}</p>
                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${badgeClasses(a.status)}`}>
                                  {a.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-1.5">
                                <Calendar className="w-3 h-3" /> {formatBRDate(a.data)}
                                <Clock className="w-3 h-3 ml-1" /> {formatHora(a.hora)}
                              </p>
                              <p className="text-xs text-slate-600">
                                <span className="font-semibold text-slate-400">Plano:</span> {a.paciente?.convenio || 'Particular'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* MODAIS (PRESERVADOS E ESTILIZADOS) */}
        {modalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
            <div className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl border border-white/40 ring-1 ring-black/5">
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                {modalType === 'remarcar' ? 'Nova Data' : 'Cancelar Atendimento'}
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                {modalType === 'remarcar' ? 'Selecione o novo horário para o atendimento.' : 'Por favor, informe o motivo do cancelamento.'}
              </p>
              
              <div className="space-y-4">
                {modalType === 'remarcar' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 ml-1">Data</label>
                      <input
                        type="date"
                        value={novaData}
                        onChange={(e) => setNovaData(e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 ml-1">Hora</label>
                      <input
                        type="time"
                        value={novaHora}
                        onChange={(e) => setNovaHora(e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-400 ml-1">Observações / Motivo</label>
                  <textarea
                    placeholder="Digite aqui..."
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm h-32 resize-none outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                >
                  CANCELAR
                </button>
                <button
                  onClick={() => {
                    if (modalType === 'remarcar')
                      handleAction(selected!.id, {
                        data: novaData,
                        hora: novaHora,
                        motivo_remarcacao: motivo,
                        status: 'PENDENTE',
                      })
                    else
                      handleAction(selected!.id, {
                        status: 'CANCELADO_FUNCIONARIO',
                        motivo_cancelamento: motivo,
                      })
                    setModalOpen(false)
                  }}
                  className="flex-[2] bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl text-xs font-bold uppercase shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all"
                >
                  CONFIRMAR
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
