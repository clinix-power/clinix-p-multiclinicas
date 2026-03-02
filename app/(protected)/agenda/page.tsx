'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type PeriodoFiltro = 'HOJE' | 'SEMANA' | 'TODOS'

type AgendamentoStatus =
  | 'PENDENTE'
  | 'CONFIRMADO'
  | 'RECUSADO'
  | 'CANCELADO_ADMIN'
  | 'CANCELADO_FUNCIONARIO'
  | 'REALIZADO'

type ModalidadeUI = 'Clínica' | 'Domiciliar' | 'Particular'
type ModalidadeDB = 'Clinica' | 'Domiciliar' | 'Particular'

type TipoServico =
  | 'Avaliação Inicial'
  | 'Drenagem'
  | 'Fisioterapia'
  | 'LPF'
  | 'Osteopatia'
  | 'Pediatria'
  | 'Pilates'
  | 'Uroginecologia'
  | 'Outro'

type PacienteItem = {
  id: string
  nome: string
  data_nascimento: string | null
  convenio: string | null
}

type ProfissionalItem = {
  id: string
  nome: string
  role: 'ADMIN' | 'FUNCIONARIO' | 'CRIADOR'
  is_active: boolean
}

type AgendamentoItem = {
  id: string
  paciente_id: string
  profissional_id: string
  data: string
  hora: string
  tipo_servico: string
  tipo_servico_outro: string | null
  modalidade: string
  status: AgendamentoStatus
  observacoes: string | null
  motivo_recusa: string | null
  motivo_cancelamento: string | null
  motivo_remarcacao?: string | null
  updated_at: string | null
  updated_by_role: 'ADMIN' | 'FUNCIONARIO' | null
}

type Repeticao = 'UNICO' | 'SEMANA' | 'MES'

// Ícones SVG inline (minimalistas)
const CalendarIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const ClockIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const RefreshIcon = ({ className = "w-5 h-5", spin = false }: { className?: string; spin?: boolean }) => (
  <svg className={`${className} ${spin ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const PlusIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
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

const EditIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const TrashIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

function hojeYYYYMMDD() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDias(yyyyMmDd: string, dias: number) {
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + dias)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function formatDataPt(yyyyMmDd: string) {
  const [y, m, d] = yyyyMmDd.split('-')
  return `${d}/${m}/${y}`
}

function isHoraHHMM(v: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v)
}

function modalidadeUiToDb(v: ModalidadeUI): ModalidadeDB {
  if (v === 'Clínica') return 'Clinica'
  if (v === 'Domiciliar') return 'Domiciliar'
  return 'Particular'
}

function canAdminRescheduleOrCancel(status: AgendamentoStatus) {
  return status === 'PENDENTE' || status === 'CONFIRMADO'
}

function getWeekday(yyyyMmDd: string) {
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.getDay()
}

function lastDayOfMonth(yyyyMmDd: string) {
  const [y, m] = yyyyMmDd.split('-').map(Number)
  const dt = new Date(y, m, 0)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function listDatesInclusive(start: string, end: string) {
  const out: string[] = []
  let cur = start
  while (cur <= end) {
    out.push(cur)
    cur = addDias(cur, 1)
  }
  return out
}

// MÉTODO CLINIX 2026 - UI Classes
const inputLight =
  'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-purple-300/60 focus:border-purple-300 transition-all'
const selectLight = inputLight
const textareaLight =
  'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-purple-300/60 focus:border-purple-300 resize-none transition-all'

// Day chip (seletor de dias da semana)
const dayChipBase =
  'px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer select-none touch-manipulation transition-all active:scale-95'
const dayChipOff =
  'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
const dayChipOn =
  'border-purple-500 bg-purple-500 text-white shadow-lg shadow-purple-400/30'

function StatusPill({ status }: { status: AgendamentoStatus }) {
  if (status === 'CONFIRMADO') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{status}</span>
      </div>
    )
  }

  if (status === 'PENDENTE') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">{status}</span>
      </div>
    )
  }

  if (status === 'REALIZADO') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200">
        <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">{status}</span>
      </div>
    )
  }

  if (status.includes('CANCELADO')) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200">
        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">{status}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200">
      <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">{status}</span>
    </div>
  )
}

export default function AgendaPage() {
  // Dados base
  const [pacientes, setPacientes] = useState<PacienteItem[]>([])
  const [profissionais, setProfissionais] = useState<ProfissionalItem[]>([])
  const [agendamentos, setAgendamentos] = useState<AgendamentoItem[]>([])
  const clinicaIdRef = useRef<string | null>(null)

  // UI
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [erroCarga, setErroCarga] = useState<string | null>(null)

  // Modal: novo agendamento
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)

  // Modal: remarcar
  const [remarcarOpen, setRemarcarOpen] = useState(false)
  const [remarcarId, setRemarcarId] = useState<string | null>(null)
  const [remData, setRemData] = useState(hojeYYYYMMDD())
  const [remHora, setRemHora] = useState('')
  const [remMotivo, setRemMotivo] = useState('')
  const [remSaving, setRemSaving] = useState(false)
  const [remErr, setRemErr] = useState<string | null>(null)

  // Modal: cancelar
  const [cancelarOpen, setCancelarOpen] = useState(false)
  const [cancelarId, setCancelarId] = useState<string | null>(null)
  const [canMotivo, setCanMotivo] = useState('')
  const [canSaving, setCanSaving] = useState(false)
  const [canErr, setCanErr] = useState<string | null>(null)

  // Modal: excluir
  const [excluirOpen, setExcluirOpen] = useState(false)
  const [excluirId, setExcluirId] = useState<string | null>(null)
  const [excSaving, setExcSaving] = useState(false)
  const [excErr, setExcErr] = useState<string | null>(null)

  // Filtros
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('SEMANA')
  const [fProfissional, setFProfissional] = useState<string>('')
  const [fStatus, setFStatus] = useState<AgendamentoStatus | ''>('')
  const [buscaPaciente, setBuscaPaciente] = useState('')

  // Form (novo agendamento)
  const [pacienteId, setPacienteId] = useState('')
  const [profissionalId, setProfissionalId] = useState('')
  const [data, setData] = useState(hojeYYYYMMDD())
  const [hora, setHora] = useState('')
  const [tipoServico, setTipoServico] = useState<TipoServico | ''>('')
  const [tipoServicoOutro, setTipoServicoOutro] = useState('')
  const [modalidade, setModalidade] = useState<ModalidadeUI | ''>('')
  const [observacoes, setObservacoes] = useState('')

  // Recorrência
  const [repeticao, setRepeticao] = useState<Repeticao>('UNICO')
  const [diasSemana, setDiasSemana] = useState<number[]>([])

  const tipoServicoOptions: TipoServico[] = [
    'Avaliação Inicial',
    'Drenagem',
    'Fisioterapia',
    'LPF',
    'Osteopatia',
    'Pediatria',
    'Pilates',
    'Uroginecologia',
    'Outro',
  ]

  const modalidadeOptions: ModalidadeUI[] = ['Clínica', 'Domiciliar', 'Particular']

  const statusOptions: AgendamentoStatus[] = [
    'PENDENTE',
    'CONFIRMADO',
    'RECUSADO',
    'CANCELADO_ADMIN',
    'CANCELADO_FUNCIONARIO',
    'REALIZADO',
  ]

  const diasLabels = useMemo(
    () => [
      { v: 1, t: 'Seg' },
      { v: 2, t: 'Ter' },
      { v: 3, t: 'Qua' },
      { v: 4, t: 'Qui' },
      { v: 5, t: 'Sex' },
      { v: 6, t: 'Sáb' },
      { v: 0, t: 'Dom' },
    ],
    []
  )

  // Modal overlay
  const modalOverlayClass =
    'fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm p-4 overflow-y-auto flex items-start justify-center'
  const modalPanelClass =
    'w-full max-w-md my-6 bg-white rounded-xl overflow-hidden border border-slate-200 shadow-2xl flex flex-col max-h-[calc(100dvh-48px)]'
  const modalHeaderClass =
    'p-5 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0'
  const modalBodyClass = 'p-5 overflow-auto flex-1'
  const modalFooterClass =
    'p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0'

  async function loadTudo(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false
    if (!silent) setLoading(true)
    setErroCarga(null)

    try {
      // Obter clinica_id do perfil autenticado para isolamento multiclínica
      const { data: s } = await supabase.auth.getSession()
      const userId = s.session?.user?.id
      if (!userId) throw new Error('Sessão expirada. Faça login novamente.')

      const { data: myProfile, error: profMeErr } = await supabase
        .from('profiles')
        .select('clinica_id')
        .eq('id', userId)
        .single()
      if (profMeErr) throw profMeErr
      if (!myProfile?.clinica_id) throw new Error('Clínica não encontrada no perfil.')
      const clinicaId = myProfile.clinica_id
      clinicaIdRef.current = clinicaId

      const { data: pacData, error: pacErr } = await supabase
        .from('pacientes')
        .select('id,nome,data_nascimento,convenio,status')
        .eq('clinica_id', clinicaId)
        .order('nome', { ascending: true })
      if (pacErr && pacErr.code !== '42703') throw pacErr
      const pacFiltrados = (pacData ?? []).filter((p: any) =>
        !p.status || p.status === 'Ativo'
      )
      setPacientes(pacFiltrados as PacienteItem[])

      const { data: profData, error: profErr } = await supabase
        .from('profiles')
        .select('id,nome,role,is_active')
        .eq('clinica_id', clinicaId)
        .eq('role', 'FUNCIONARIO')
        .eq('is_active', true)
        .order('nome', { ascending: true })
      if (profErr) throw profErr
      setProfissionais((profData ?? []) as ProfissionalItem[])

      const { data: agData, error: agErr } = await supabase
        .from('agendamentos')
        .select(
          'id,paciente_id,profissional_id,data,hora,tipo_servico,tipo_servico_outro,modalidade,status,observacoes,motivo_recusa,motivo_cancelamento,motivo_remarcacao,updated_at,updated_by_role'
        )
        .eq('clinica_id', clinicaId)
        .order('data', { ascending: true })
        .order('hora', { ascending: true })
      if (agErr) throw agErr
      setAgendamentos((agData ?? []) as AgendamentoItem[])
    } catch (e: any) {
      console.error('[agenda] load error', e)
      setErroCarga('Erro ao carregar agenda')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const refreshInFlight = useRef(false)

  async function handleRefresh() {
    if (refreshInFlight.current) return
    refreshInFlight.current = true
    setRefreshing(true)
    try {
      await loadTudo({ silent: true })
    } finally {
      setRefreshing(false)
      refreshInFlight.current = false
    }
  }

  useEffect(() => {
    loadTudo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      handleRefresh()
    }, 120_000)

    const onVis = () => {
      if (!document.hidden) handleRefresh()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVis)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pacientesById = useMemo(() => {
    const m = new Map<string, PacienteItem>()
    for (const p of pacientes) m.set(p.id, p)
    return m
  }, [pacientes])

  const profById = useMemo(() => {
    const m = new Map<string, ProfissionalItem>()
    for (const p of profissionais) m.set(p.id, p)
    return m
  }, [profissionais])

  const agendamentosFiltrados = useMemo(() => {
    const hoje = hojeYYYYMMDD()
    const fimSemana = addDias(hoje, 7)

    return agendamentos.filter((a) => {
      if (periodo === 'HOJE' && a.data !== hoje) return false
      if (periodo === 'SEMANA' && (a.data < hoje || a.data > fimSemana)) return false

      if (fProfissional && a.profissional_id !== fProfissional) return false
      if (fStatus && a.status !== fStatus) return false

      if (buscaPaciente.trim()) {
        const p = pacientesById.get(a.paciente_id)
        const nome = (p?.nome ?? '').toLowerCase()
        if (!nome.includes(buscaPaciente.trim().toLowerCase())) return false
      }

      return true
    })
  }, [agendamentos, periodo, fProfissional, fStatus, buscaPaciente, pacientesById])

  const agAgrupadoPorData = useMemo(() => {
    const m = new Map<string, AgendamentoItem[]>()
    for (const a of agendamentosFiltrados) {
      if (!m.has(a.data)) m.set(a.data, [])
      m.get(a.data)!.push(a)
    }
    return Array.from(m.entries()).sort(([d1], [d2]) => (d1 < d2 ? -1 : 1))
  }, [agendamentosFiltrados])

  function resetForm() {
    setPacienteId('')
    setProfissionalId('')
    setData(hojeYYYYMMDD())
    setHora('')
    setTipoServico('')
    setTipoServicoOutro('')
    setModalidade('')
    setObservacoes('')
    setSaveErr(null)

    setRepeticao('UNICO')
    setDiasSemana([])
  }

  useEffect(() => {
    if (repeticao === 'UNICO') return
    setDiasSemana((prev) => (prev.length ? prev : [getWeekday(data)]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repeticao])

  useEffect(() => {
    if (repeticao === 'UNICO') return
    setDiasSemana((prev) => (prev.length ? prev : [getWeekday(data)]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  async function validarConflito(profId: string, d: string, h: string, ignoreId?: string | null) {
    const { data: conflit, error } = await supabase
      .from('agendamentos')
      .select('id')
      .eq('profissional_id', profId)
      .eq('data', d)
      .eq('hora', h)
      .limit(10)

    if (error) throw error

    const list = (conflit ?? []) as { id: string }[]
    const filtered = ignoreId ? list.filter((x) => x.id !== ignoreId) : list
    return filtered.length > 0
  }

  function toggleDia(v: number) {
    setDiasSemana((prev) => {
      const next = prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
      return next.slice().sort((a, b) => a - b)
    })
  }

  function onDayChipPress(v: number) {
    toggleDia(v)
  }

  async function criarAgendamento() {
    setSaveErr(null)

    // Garantir sessão válida antes de qualquer operação
    const { data: sessionCheck, error: sessionErr } = await supabase.auth.getSession()
    if (sessionErr || !sessionCheck.session?.access_token) {
      setSaveErr('Sessão expirada. Recarregue a página e faça login novamente.')
      return
    }

    if (!pacienteId) return setSaveErr('Selecione um paciente.')
    if (!profissionalId) return setSaveErr('Selecione um profissional.')
    if (!data) return setSaveErr('Informe a data.')
    if (!hora || !isHoraHHMM(hora)) return setSaveErr('Informe a hora no formato HH:MM.')
    if (!tipoServico) return setSaveErr('Selecione o tipo de serviço.')
    if (tipoServico === 'Outro' && !tipoServicoOutro.trim()) {
      return setSaveErr('Informe o tipo de serviço (Outro).')
    }
    if (!modalidade) return setSaveErr('Selecione a modalidade.')

    if (repeticao !== 'UNICO' && diasSemana.length === 0) {
      return setSaveErr('Selecione ao menos 1 dia da semana para repetir.')
    }

    setSaving(true)
    try {
      const basePayload = {
        paciente_id: pacienteId,
        profissional_id: profissionalId,
        clinica_id: clinicaIdRef.current,
        hora,
        tipo_servico: tipoServico,
        tipo_servico_outro: tipoServico === 'Outro' ? tipoServicoOutro.trim() : null,
        modalidade: modalidadeUiToDb(modalidade),
        status: 'PENDENTE' as AgendamentoStatus,
        observacoes: observacoes.trim() ? observacoes.trim() : null,
        updated_by_role: 'ADMIN' as const,
      }

      if (repeticao === 'UNICO') {
        const temConflito = await validarConflito(profissionalId, data, hora, null)
        if (temConflito) {
          setSaving(false)
          return setSaveErr('Esse profissional já tem horário marcado nesse dia e hora.')
        }

        const { error } = await supabase.from('agendamentos').insert({ ...basePayload, data })
        if (error) throw error

        setModalOpen(false)
        resetForm()
        await loadTudo({ silent: true })
        return
      }

      const start = data
      const end = repeticao === 'SEMANA' ? addDias(data, 6) : lastDayOfMonth(data)
      const dates = listDatesInclusive(start, end)
        .filter((d) => diasSemana.includes(getWeekday(d)))
        .sort()

      if (dates.length === 0) {
        setSaving(false)
        return setSaveErr('Nenhuma data gerada. Ajuste os dias da semana selecionados.')
      }

      for (const d of dates) {
        const temConflito = await validarConflito(profissionalId, d, hora, null)
        if (temConflito) {
          setSaving(false)
          return setSaveErr(
            `Conflito: já existe horário para esse profissional em ${formatDataPt(d)} às ${hora}.`
          )
        }
      }

      const payloads = dates.map((d) => ({ ...basePayload, data: d }))
      const { error } = await supabase.from('agendamentos').insert(payloads)
      if (error) throw error

      setModalOpen(false)
      resetForm()
      await loadTudo({ silent: true })
    } catch (e: any) {
      console.error('[agenda] insert error', e)
      const msg = e?.message || e?.details || e?.hint || 'Erro ao criar agendamento.'
      setSaveErr(msg)
    } finally {
      setSaving(false)
    }
  }

  function openRemarcar(a: AgendamentoItem) {
    setRemErr(null)
    setRemarcarId(a.id)
    setRemData(a.data)
    setRemHora((a.hora || '').slice(0, 5))
    setRemMotivo('')
    setRemarcarOpen(true)
  }

  async function confirmarRemarcacao() {
    setRemErr(null)
    if (!remarcarId) return

    if (!remData) return setRemErr('Informe a data.')
    if (!remHora || !isHoraHHMM(remHora)) return setRemErr('Informe a hora no formato HH:MM.')
    if (!remMotivo.trim()) return setRemErr('Informe o motivo da remarcação.')

    const current = agendamentos.find((x) => x.id === remarcarId)
    if (!current) return setRemErr('Agendamento não encontrado.')

    setRemSaving(true)
    try {
      const temConflito = await validarConflito(current.profissional_id, remData, remHora, remarcarId)
      if (temConflito) {
        setRemSaving(false)
        return setRemErr('Conflito: profissional já tem horário marcado nesse dia e hora.')
      }

      const { error } = await supabase
        .from('agendamentos')
        .update({
          data: remData,
          hora: remHora,
          status: 'PENDENTE',
          motivo_remarcacao: remMotivo.trim(),
          updated_by_role: 'ADMIN',
        })
        .eq('id', remarcarId)

      if (error) throw error

      setRemarcarOpen(false)
      setRemarcarId(null)
      await loadTudo({ silent: true })
    } catch (e: any) {
      console.error('[agenda] remarcar error', e)
      setRemErr(e?.message || 'Erro ao remarcar.')
    } finally {
      setRemSaving(false)
    }
  }

  function openCancelar(a: AgendamentoItem) {
    setCanErr(null)
    setCancelarId(a.id)
    setCanMotivo('')
    setCancelarOpen(true)
  }

  async function confirmarCancelamento() {
    setCanErr(null)
    if (!cancelarId) return
    if (!canMotivo.trim()) return setCanErr('Informe o motivo do cancelamento.')

    setCanSaving(true)
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({
          status: 'CANCELADO_ADMIN',
          motivo_cancelamento: canMotivo.trim(),
          updated_by_role: 'ADMIN',
        })
        .eq('id', cancelarId)

      if (error) throw error

      setCancelarOpen(false)
      setCancelarId(null)
      await loadTudo({ silent: true })
    } catch (e: any) {
      console.error('[agenda] cancelar error', e)
      setCanErr(e?.message || 'Erro ao cancelar.')
    } finally {
      setCanSaving(false)
    }
  }

  function openExcluir(a: AgendamentoItem) {
    setExcErr(null)
    setExcluirId(a.id)
    setExcluirOpen(true)
  }

  async function confirmarExclusao() {
    setExcErr(null)
    if (!excluirId) return

    setExcSaving(true)
    try {
      const { error } = await supabase.from('agendamentos').delete().eq('id', excluirId)
      if (error) throw error

      setExcluirOpen(false)
      setExcluirId(null)
      await loadTudo({ silent: true })
    } catch (e: any) {
      console.error('[agenda] excluir error', e)
      setExcErr(e?.message || 'Erro ao excluir.')
    } finally {
      setExcSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] pb-8">
      {/* Header Sticky com Glassmorphism */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-sm">
                  <CalendarIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Agenda</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Controle de atendimentos futuros da clínica</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                <RefreshIcon className="w-3.5 h-3.5" spin={refreshing} />
                {refreshing ? 'Atualizando...' : 'Atualizar'}
              </button>

              <button
                type="button"
                onClick={() => {
                  resetForm()
                  setModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs font-semibold shadow-lg shadow-purple-400/30 hover:shadow-xl hover:shadow-purple-400/40 transition-all active:scale-95"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Novo agendamento
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Container Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {erroCarga && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erroCarga}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Período</label>
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value as PeriodoFiltro)}
                className={selectLight}
              >
                <option value="HOJE">Hoje</option>
                <option value="SEMANA">Semana</option>
                <option value="TODOS">Todos</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Profissional</label>
              <select
                value={fProfissional}
                onChange={(e) => setFProfissional(e.target.value)}
                className={selectLight}
              >
                <option value="">Todos</option>
                {profissionais.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Status</label>
              <select
                value={fStatus}
                onChange={(e) => setFStatus(e.target.value as any)}
                className={selectLight}
              >
                <option value="">Todos</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Buscar paciente</label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={buscaPaciente}
                  onChange={(e) => setBuscaPaciente(e.target.value)}
                  placeholder="Digite o nome..."
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-purple-300/60 focus:border-purple-300 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Agendamentos */}
        <div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl p-5 border border-slate-100 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-1/4 mb-4" />
                  <div className="space-y-3">
                    <div className="h-16 bg-slate-100 rounded-lg" />
                    <div className="h-16 bg-slate-100 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : agAgrupadoPorData.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
              <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-4">
                <CalendarIcon className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-900 mb-1">Nenhum agendamento encontrado</p>
              <p className="text-xs text-slate-500">Ajuste os filtros ou crie um novo agendamento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {agAgrupadoPorData.map(([d, items]) => (
                <div key={d} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-bold text-slate-900">{formatDataPt(d)}</span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">{items.length} agendamento(s)</span>
                  </div>

                  <div className="p-3 space-y-2">
                    {items.map((a) => {
                      const p = pacientesById.get(a.paciente_id)
                      const prof = profById.get(a.profissional_id)
                      const tipo =
                        a.tipo_servico === 'Outro'
                          ? `Outro: ${a.tipo_servico_outro ?? ''}`
                          : a.tipo_servico

                      const canActions = canAdminRescheduleOrCancel(a.status)

                      return (
                        <div
                          key={a.id}
                          className="group bg-white rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200 hover:border-purple-200/60 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="shrink-0 w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                              <ClockIcon className="w-5 h-5 text-purple-600" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-purple-600 font-mono">
                                  {(a.hora || '').slice(0, 5)}
                                </span>
                                <StatusPill status={a.status} />
                              </div>
                              <div className="text-sm font-semibold text-slate-900 truncate">
                                {p?.nome ?? 'Paciente'}
                              </div>
                              <div className="text-xs text-slate-600 truncate mt-0.5">
                                {prof?.nome ?? 'Profissional'} • {tipo} • {a.modalidade}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {canActions && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openRemarcar(a)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium transition-all active:scale-95"
                                >
                                  <EditIcon className="w-3.5 h-3.5" />
                                  Remarcar
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openCancelar(a)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 hover:border-red-300 text-red-700 text-xs font-medium transition-all active:scale-95"
                                >
                                  <XIcon className="w-3.5 h-3.5" />
                                  Cancelar
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => openExcluir(a)}
                              title="Excluir agendamento"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-600 text-xs font-medium transition-all active:scale-95"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: NOVO AGENDAMENTO */}
      {modalOpen && (
        <div
          className={modalOverlayClass}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalOpen(false)
              resetForm()
            }
          }}
        >
          <div className={modalPanelClass}>
            <div className={modalHeaderClass}>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Novo agendamento</h2>
                <p className="text-xs text-slate-600 mt-1">Status inicial: PENDENTE</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false)
                  resetForm()
                }}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className={modalBodyClass}>
              {saveErr && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {saveErr}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Paciente *</label>
                  <select
                    value={pacienteId}
                    onChange={(e) => setPacienteId(e.target.value)}
                    className={selectLight}
                  >
                    <option value="" disabled>
                      Selecione um paciente
                    </option>
                    {pacientes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Profissional *</label>
                  <select
                    value={profissionalId}
                    onChange={(e) => setProfissionalId(e.target.value)}
                    className={selectLight}
                  >
                    <option value="" disabled>
                      Selecione um profissional
                    </option>
                    {profissionais.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Repetição</label>
                  <select
                    value={repeticao}
                    onChange={(e) => setRepeticao(e.target.value as any)}
                    className={selectLight}
                  >
                    <option value="UNICO">Único</option>
                    <option value="SEMANA">Semana toda</option>
                    <option value="MES">Mês todo</option>
                  </select>

                  {repeticao !== 'UNICO' && (
                    <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50/40 p-4">
                      <div className="text-xs text-slate-600 mb-3 font-medium">
                        Selecione os dias do paciente:
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {diasLabels.map((d) => {
                          const active = diasSemana.includes(d.v)
                          return (
                            <button
                              key={d.v}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onDayChipPress(d.v)
                              }}
                              className={`${dayChipBase} ${active ? dayChipOn : dayChipOff}`}
                              aria-pressed={active}
                            >
                              {d.t}
                            </button>
                          )
                        })}
                      </div>

                      <div className="mt-3 text-xs text-slate-500">
                        {repeticao === 'SEMANA'
                          ? 'Cria agendamentos do dia selecionado até os próximos 7 dias.'
                          : 'Cria agendamentos do dia selecionado até o fim do mês.'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Data *</label>
                    <input
                      type="date"
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                      className={inputLight}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Hora *</label>
                    <input
                      type="time"
                      value={hora}
                      onChange={(e) => setHora(e.target.value)}
                      className={inputLight}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Tipo de serviço *</label>
                  <select
                    value={tipoServico}
                    onChange={(e) => {
                      const v = e.target.value as TipoServico
                      setTipoServico(v)
                      if (v !== 'Outro') setTipoServicoOutro('')
                    }}
                    className={selectLight}
                  >
                    <option value="" disabled>
                      Selecione o tipo
                    </option>
                    {tipoServicoOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {tipoServico === 'Outro' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Tipo (Outro) *</label>
                    <input
                      value={tipoServicoOutro}
                      onChange={(e) => setTipoServicoOutro(e.target.value)}
                      className={inputLight}
                      placeholder="Descreva..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Modalidade *</label>
                  <select
                    value={modalidade}
                    onChange={(e) => setModalidade(e.target.value as ModalidadeUI)}
                    className={selectLight}
                  >
                    <option value="" disabled>
                      Selecione a modalidade
                    </option>
                    {modalidadeOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Observações</label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className={`${textareaLight} h-20`}
                    placeholder="Opcional..."
                  />
                </div>
              </div>
            </div>

            <div className={modalFooterClass}>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false)
                  resetForm()
                }}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium transition-all active:scale-95"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={criarAgendamento}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-semibold shadow-lg shadow-purple-400/30 hover:shadow-xl hover:shadow-purple-400/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {saving ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REMARCAR */}
      {remarcarOpen && (
        <div
          className={modalOverlayClass}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRemarcarOpen(false)
              setRemarcarId(null)
              setRemErr(null)
            }
          }}
        >
          <div className={modalPanelClass}>
            <div className={modalHeaderClass}>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Remarcar</h2>
                <p className="text-xs text-slate-600 mt-1">
                  Status volta para <b>PENDENTE</b>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRemarcarOpen(false)
                  setRemarcarId(null)
                  setRemErr(null)
                }}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className={modalBodyClass}>
              {remErr && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {remErr}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Nova data *</label>
                    <input
                      type="date"
                      value={remData}
                      onChange={(e) => setRemData(e.target.value)}
                      className={inputLight}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Nova hora *</label>
                    <input
                      type="time"
                      value={remHora}
                      onChange={(e) => setRemHora(e.target.value)}
                      className={inputLight}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Motivo *</label>
                  <textarea
                    value={remMotivo}
                    onChange={(e) => setRemMotivo(e.target.value)}
                    className={`${textareaLight} h-20`}
                    placeholder="Ex: conflito de agenda..."
                  />
                </div>
              </div>
            </div>

            <div className={modalFooterClass}>
              <button
                type="button"
                onClick={() => {
                  setRemarcarOpen(false)
                  setRemarcarId(null)
                  setRemErr(null)
                }}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium transition-all active:scale-95"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={confirmarRemarcacao}
                disabled={remSaving}
                className="px-5 py-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-semibold shadow-lg shadow-purple-400/30 hover:shadow-xl hover:shadow-purple-400/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {remSaving ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CANCELAR */}
      {cancelarOpen && (
        <div
          className={modalOverlayClass}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCancelarOpen(false)
              setCancelarId(null)
              setCanErr(null)
            }
          }}
        >
          <div className={modalPanelClass}>
            <div className={modalHeaderClass}>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Cancelar</h2>
                <p className="text-xs text-slate-600 mt-1">
                  Marca como <b>CANCELADO_ADMIN</b>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCancelarOpen(false)
                  setCancelarId(null)
                  setCanErr(null)
                }}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className={modalBodyClass}>
              {canErr && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {canErr}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Motivo *</label>
                <textarea
                  value={canMotivo}
                  onChange={(e) => setCanMotivo(e.target.value)}
                  className={`${textareaLight} h-20`}
                  placeholder="Ex: paciente desistiu..."
                />
              </div>
            </div>

            <div className={modalFooterClass}>
              <button
                type="button"
                onClick={() => {
                  setCancelarOpen(false)
                  setCancelarId(null)
                  setCanErr(null)
                }}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium transition-all active:scale-95"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={confirmarCancelamento}
                disabled={canSaving}
                className="px-4 py-2 rounded-lg bg-red-50 border border-red-200 hover:border-red-300 text-red-700 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {canSaving ? 'Cancelando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUIR */}
      {excluirOpen && (
        <div
          className={modalOverlayClass}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setExcluirOpen(false)
              setExcluirId(null)
              setExcErr(null)
            }
          }}
        >
          <div className="w-full max-w-sm my-6 bg-white rounded-xl overflow-hidden border border-slate-200 shadow-2xl flex flex-col max-h-[calc(100dvh-48px)]">
            <div className={modalHeaderClass}>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Excluir</h2>
                <p className="text-xs text-slate-600 mt-1">Remove do banco (irreversível)</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setExcluirOpen(false)
                  setExcluirId(null)
                  setExcErr(null)
                }}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className={modalBodyClass}>
              {excErr && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {excErr}
                </div>
              )}
              <div className="text-sm text-slate-700">Confirmar exclusão deste agendamento?</div>
            </div>

            <div className={modalFooterClass}>
              <button
                type="button"
                onClick={() => {
                  setExcluirOpen(false)
                  setExcluirId(null)
                  setExcErr(null)
                }}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium transition-all active:scale-95"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={confirmarExclusao}
                disabled={excSaving}
                className="px-5 py-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-semibold shadow-lg shadow-purple-400/30 hover:shadow-xl hover:shadow-purple-400/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {excSaving ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
