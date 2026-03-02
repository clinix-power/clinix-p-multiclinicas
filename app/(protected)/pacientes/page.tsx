'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Trash2 } from 'lucide-react'

type PacienteRow = {
  id: string
  nome: string
  data_nascimento: string | null
  convenio: string | null
  convenio_outro: string | null
  status: string | null
  created_at: string
  whatsapp?: string | null
  celular?: string | null
  email?: string | null
}

type ConvenioItem = {
  id: string
  nome: string
  valor_sessao: number
  cor: string
  is_padrao: boolean
}

type PacienteForm = {
  nome: string
  data_nascimento: string
  cpf: string
  genero: string
  celular: string
  whatsapp: string
  email: string
  cep: string
  uf: string
  cidade: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  responsavel_legal_nome: string
  responsavel_legal_cpf: string
  profissao: string
  convenio: string
  convenio_outro: string
  convenio_numero: string
  convenio_id: string
  valor_sessao_override: string
  desconto_particular: string
  justificativa: string
  diagnostico_clinico: string
  plano_pagamento: string
  plano_pagamento_outro: string
  frequencia: string
  frequencia_outro: string
  plano_inicio: string
  plano_fim: string
  status: string
}

const emptyForm: PacienteForm = {
  nome: '',
  data_nascimento: '',
  cpf: '',
  genero: '',
  celular: '',
  whatsapp: '',
  email: '',
  cep: '',
  uf: '',
  cidade: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  responsavel_legal_nome: '',
  responsavel_legal_cpf: '',
  profissao: '',
  convenio: '',
  convenio_outro: '',
  convenio_numero: '',
  convenio_id: '',
  valor_sessao_override: '',
  desconto_particular: '',
  justificativa: '',
  diagnostico_clinico: '',
  plano_pagamento: '',
  plano_pagamento_outro: '',
  frequencia: '',
  frequencia_outro: '',
  plano_inicio: '',
  plano_fim: '',
  status: 'Ativo',
}

function onlyDigits(s: string) {
  return (s || '').replace(/\D/g, '')
}

function normalizeWhatsappInput(v: string) {
  const digits = onlyDigits(v)
  return digits.slice(0, 13)
}

function toWhatsAppLink(digits: string) {
  const d = onlyDigits(digits)
  if (!d) return null
  const withCountry = d.startsWith('55') ? d : `55${d}`
  return `https://wa.me/${withCountry}`
}

function formatBRDate(isoDate: string | null) {
  if (!isoDate) return '—'
  const [y, m, d] = isoDate.split('-')
  if (!y || !m || !d) return isoDate
  return `${d}/${m}/${y}`
}

function convenioLabel(convenio: string | null, outro: string | null) {
  if (!convenio) return '—'
  if (convenio === 'Outro') return outro?.trim() ? outro : 'Outro'
  return convenio
}

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addMonthsISO(iso: string, months: number) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  const dt = new Date(y, m - 1, d)
  dt.setMonth(dt.getMonth() + months)

  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function monthsByPlano(plano: string) {
  switch ((plano || '').trim()) {
    case 'Mensal':
      return 1
    case 'Trimestral':
      return 3
    case 'Semestral':
      return 6
    case 'Anual':
      return 12
    default:
      return 0
  }
}

function computeFim(plano: string, inicio: string) {
  if (!inicio) return ''
  if (!plano) return ''
  if (plano === 'Outro') return ''
  if (plano === 'Avulso') return inicio
  const months = monthsByPlano(plano)
  if (!months) return ''
  return addMonthsISO(inicio, months)
}

const SELECT_PLACEHOLDER_VALUE = '__placeholder__'

export default function PacientesPage() {
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<'Ativo' | 'Inativo'>('Ativo')
  const [lista, setLista] = useState<PacienteRow[]>([])
  const [loadingLista, setLoadingLista] = useState(false)
  const [erroLista, setErroLista] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'ADMIN' | 'FUNCIONARIO' | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState<PacienteForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement | null>(null)

  const [planoInicioTouched, setPlanoInicioTouched] = useState(false)
  const [planoFimTouched, setPlanoFimTouched] = useState(false)
  const clinicaIdRef = useRef<string | null>(null)

  // Convênios dinâmicos
  const [conveniosList, setConveniosList] = useState<ConvenioItem[]>([])
  const [conveniosLoading, setConveniosLoading] = useState(false)
  // Mini-modal novo convênio inline
  const [miniModalOpen, setMiniModalOpen] = useState(false)
  const [miniNome, setMiniNome] = useState('')
  const [miniValor, setMiniValor] = useState('')
  const [miniCriando, setMiniCriando] = useState(false)

  function normalizeSelectValue(v: string) {
    return v === SELECT_PLACEHOLDER_VALUE ? '' : v
  }

  async function loadConvenios() {
    setConveniosLoading(true)
    try {
      const clinicaId = clinicaIdRef.current
      if (!clinicaId) return
      const { data } = await supabase
        .from('convenios')
        .select('id,nome,valor_sessao,cor,is_padrao')
        .eq('clinica_id', clinicaId)
        .eq('ativo', true)
        .order('nome', { ascending: true })
      setConveniosList((data || []) as ConvenioItem[])
    } finally {
      setConveniosLoading(false)
    }
  }

  async function load() {
    setLoadingLista(true)
    setErroLista(null)

    // Obter clinica_id do perfil autenticado (cacheado no ref para evitar re-fetch a cada busca)
    if (!clinicaIdRef.current) {
      const { data: s } = await supabase.auth.getSession()
      const userId = s.session?.user?.id
      if (!userId) { setLoadingLista(false); return }
      const { data: prof } = await supabase
        .from('profiles')
        .select('clinica_id')
        .eq('id', userId)
        .single()
      if (!prof?.clinica_id) { setLoadingLista(false); return }
      clinicaIdRef.current = prof.clinica_id
      await loadConvenios()
    }

    let q = supabase
      .from('pacientes')
      .select('id,nome,data_nascimento,convenio,convenio_outro,status,created_at,whatsapp,celular,email')
      .eq('clinica_id', clinicaIdRef.current)
      .order('nome', { ascending: true })
      .eq('status', statusFiltro)

    const term = busca.trim()
    if (term) {
      const digits = onlyDigits(term)
      const ors: string[] = [`nome.ilike.%${term}%`]
      if (digits.length >= 3) {
        ors.push(`celular.ilike.%${digits}%`)
        ors.push(`whatsapp.ilike.%${digits}%`)
      }
      q = q.or(ors.join(','))
    }

    const { data, error } = await q
    if (error) {
      console.error('[pacientes] load error', error)
      setErroLista('Erro ao carregar pacientes.')
      setLista([])
    } else {
      setLista((data || []) as PacienteRow[])
    }

    setLoadingLista(false)
  }

  useEffect(() => {
    async function loadUserRole() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()
      if (profile?.role) setUserRole(profile.role as 'ADMIN' | 'FUNCIONARIO')
    }
    loadUserRole()
  }, [])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFiltro])

  useEffect(() => {
    const t = setTimeout(() => load(), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca])

  useEffect(() => {
    if (open) setTimeout(() => firstFieldRef.current?.focus(), 50)
  }, [open])

  function openCreate() {
    setMode('create')
    setEditingId(null)
    setForm(emptyForm)
    setErroForm(null)
    setPlanoInicioTouched(false)
    setPlanoFimTouched(false)
    if (conveniosList.length === 0) loadConvenios()
    setOpen(true)
  }

  async function openEdit(p: PacienteRow) {
    setMode('edit')
    setEditingId(p.id)
    setErroForm(null)
    if (conveniosList.length === 0) loadConvenios()

    const { data, error } = await supabase.from('pacientes').select('*').eq('id', p.id).single()
    if (error || !data) {
      console.error('[pacientes] openEdit error', error)
      setErroLista('Erro ao abrir paciente para edição.')
      return
    }

    const filled: PacienteForm = {
      ...emptyForm,
      ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? ''])),
      data_nascimento: data.data_nascimento ?? '',
      desconto_particular: data.desconto_particular != null ? String(data.desconto_particular) : '',
      convenio_id: data.convenio_id ?? '',
      valor_sessao_override: data.valor_sessao_override != null ? String(data.valor_sessao_override) : '',
      status: data.status ?? 'Ativo',
      celular: data.celular ?? '',
      whatsapp: data.whatsapp ?? '',
      email: data.email ?? '',
      plano_inicio: data.plano_inicio ?? '',
      plano_fim: data.plano_fim ?? '',
    }

    const autoed = applyPlanoAuto(filled, { force: false, allowFillIfEmpty: true })

    setForm(autoed)
    setPlanoInicioTouched(!!(autoed.plano_inicio || data.plano_inicio))
    setPlanoFimTouched(!!(autoed.plano_fim || data.plano_fim))

    setOpen(true)
  }

  async function deletarPaciente(id: string, nome: string) {
    if (deletingId) return
    if (!confirm(`Tem certeza que deseja excluir o paciente "${nome}"?\n\nEsta ação não pode ser desfeita.`)) return

    setDeletingId(id)
    try {
      const { error } = await supabase.from('pacientes').delete().eq('id', id)
      if (error) throw error
      await load()
    } catch (err) {
      console.error('[pacientes] delete error', err)
      alert('Erro ao excluir paciente. Tente novamente.')
    } finally {
      setDeletingId(null)
    }
  }

  function closeModal() {
    setOpen(false)
  }

  function applyPlanoAuto(next: PacienteForm, opts?: { force?: boolean; allowFillIfEmpty?: boolean }) {
    const force = opts?.force ?? false
    const allowFillIfEmpty = opts?.allowFillIfEmpty ?? false

    const plano = next.plano_pagamento || ''
    const inicioAtual = next.plano_inicio || ''
    const fimAtual = next.plano_fim || ''

    let inicio = inicioAtual
    const canSetInicio = force || (!planoInicioTouched && (!inicioAtual || allowFillIfEmpty))
    if (canSetInicio) {
      if (plano && plano !== SELECT_PLACEHOLDER_VALUE) inicio = todayISO()
    }

    let fim = fimAtual
    const canSetFim = force || (!planoFimTouched && (allowFillIfEmpty || true))
    if (canSetFim) {
      fim = computeFim(plano, inicio)
    }

    return { ...next, plano_inicio: inicio, plano_fim: fim }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target

    if (name === 'plano_inicio') setPlanoInicioTouched(true)
    if (name === 'plano_fim') setPlanoFimTouched(true)

    if (name === 'whatsapp') {
      const cleaned = normalizeWhatsappInput(value)
      setForm((prev) => ({ ...prev, whatsapp: cleaned }))
      return
    }

    if (name === 'celular') {
      const cleaned = onlyDigits(value).slice(0, 13)
      setForm((prev) => ({ ...prev, celular: cleaned }))
      return
    }

    if (e.target instanceof HTMLSelectElement) {
      const v = normalizeSelectValue(value)

      setForm((prev) => {
        let next = { ...prev, [name]: v }

        if (name === 'convenio' && v !== 'Outro') next.convenio_outro = ''
        if (name === 'plano_pagamento' && v !== 'Outro') next.plano_pagamento_outro = ''
        if (name === 'frequencia' && v !== 'Outro') next.frequencia_outro = ''

        if (name === 'plano_pagamento') {
          next = applyPlanoAuto(next, { force: false })
        }

        return next
      })
      return
    }

    setForm((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'plano_inicio' && !planoFimTouched) {
        return { ...next, plano_fim: computeFim(next.plano_pagamento, value) }
      }
      return next
    })
  }

  async function handleCEPBlur() {
    const cep = onlyDigits(form.cep || '')
    if (cep.length !== 8) return

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const json = await res.json()
      if (json?.erro) return
      setForm((prev) => ({
        ...prev,
        uf: json.uf || prev.uf,
        cidade: json.localidade || prev.cidade,
        logradouro: json.logradouro || prev.logradouro,
        bairro: json.bairro || prev.bairro,
      }))
    } catch {
      // manual
    }
  }

  function normalizeOutroFields(payload: any) {
    if (payload.convenio !== 'Outro') payload.convenio_outro = null
    if (payload.plano_pagamento !== 'Outro') payload.plano_pagamento_outro = null
    if (payload.frequencia !== 'Outro') payload.frequencia_outro = null
    return payload
  }

  async function salvar() {
    setErroForm(null)

    if (!form.nome.trim()) {
      setErroForm('Nome é obrigatório.')
      return
    }

    if (form.convenio === 'Outro' && !form.convenio_outro.trim()) {
      setErroForm('Preencha o convênio (Outro).')
      return
    }
    if (form.plano_pagamento === 'Outro' && !form.plano_pagamento_outro.trim()) {
      setErroForm('Preencha o plano de pagamento (Outro).')
      return
    }
    if (form.frequencia === 'Outro' && !form.frequencia_outro.trim()) {
      setErroForm('Preencha a frequência (Outro).')
      return
    }

    setSaving(true)

    const safeForm = applyPlanoAuto(form, { force: false, allowFillIfEmpty: true })

    const payload: any = {
      nome: (safeForm.nome || '').trim(),
      data_nascimento: safeForm.data_nascimento || null,
      cpf: onlyDigits(safeForm.cpf || '') || null,
      genero: safeForm.genero || null,
      celular: safeForm.celular ? onlyDigits(safeForm.celular) : null,
      whatsapp: safeForm.whatsapp ? onlyDigits(safeForm.whatsapp) : null,
      email: safeForm.email || null,
      cep: safeForm.cep || null,
      uf: safeForm.uf || null,
      cidade: safeForm.cidade || null,
      logradouro: safeForm.logradouro || null,
      numero: safeForm.numero || null,
      complemento: safeForm.complemento || null,
      bairro: safeForm.bairro || null,
      responsavel_legal_nome: safeForm.responsavel_legal_nome || null,
      responsavel_legal_cpf: onlyDigits(safeForm.responsavel_legal_cpf || '') || null,
      profissao: safeForm.profissao || null,
      convenio: safeForm.convenio || null,
      convenio_outro: safeForm.convenio_outro || null,
      convenio_numero: safeForm.convenio_numero || null,
      convenio_id: safeForm.convenio_id || null,
      valor_sessao_override: safeForm.valor_sessao_override && safeForm.valor_sessao_override.trim() ? Number(safeForm.valor_sessao_override) : null,
      desconto_particular: safeForm.desconto_particular ? Number(safeForm.desconto_particular) : null,
      justificativa: safeForm.justificativa || null,
      diagnostico_clinico: safeForm.diagnostico_clinico || null,
      plano_pagamento: safeForm.plano_pagamento || null,
      plano_pagamento_outro: safeForm.plano_pagamento_outro || null,
      frequencia: safeForm.frequencia || null,
      frequencia_outro: safeForm.frequencia_outro || null,
      plano_inicio: safeForm.plano_inicio || null,
      plano_fim: safeForm.plano_fim || null,
      status: safeForm.status || 'Ativo',
    }

    // Incluir clinica_id apenas em novo cadastro (vem do perfil autenticado, nunca de parâmetro externo)
    if (mode === 'create' && clinicaIdRef.current) {
      payload.clinica_id = clinicaIdRef.current
    }

    normalizeOutroFields(payload)

    const result =
      mode === 'create'
        ? await supabase.from('pacientes').insert(payload).select('id').single()
        : await supabase.from('pacientes').update(payload).eq('id', editingId).select('id').single()

    if (result.error) {
      console.error('[pacientes] save error', result.error)
      const msg = result.error.message || (result.error as any).details || 'Erro ao salvar paciente.'
      setErroForm(msg)
      setSaving(false)
      return
    }

    setSaving(false)
    closeModal()
    await load()
  }

  const rows = useMemo(() => lista, [lista])

  function subtitle(p: PacienteRow) {
    const dn = formatBRDate(p.data_nascimento)
    const conv = convenioLabel(p.convenio, p.convenio_outro)
    return `Nascimento: ${dn} • Convênio: ${conv}`
  }

  const placeholderOption = (
    <option value={SELECT_PLACEHOLDER_VALUE} disabled>
      Selecione
    </option>
  )

  const inputClass =
    'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-300/60 focus:border-purple-300 transition-all text-sm'
  const selectClass =
    'w-full md:w-40 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-purple-300/60 focus:border-purple-300 transition-all text-sm'
  const selectInFormClass =
    'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-purple-300/60 focus:border-purple-300 transition-all text-sm'
  const textareaClass =
    'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-300/60 focus:border-purple-300 resize-y transition-all text-sm'

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* HEADER - Glass Navigation */}
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 mb-6 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">Pacientes</h1>
                <p className="text-xs text-slate-600">Gestão completa de cadastros</p>
              </div>
            </div>

            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-semibold shadow-lg shadow-purple-400/30 hover:shadow-xl hover:shadow-purple-400/40 transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Novo Paciente
            </button>
          </div>
        </div>

        {/* FILTERS & SEARCH */}
        <div className="mb-6 space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, CPF, celular ou WhatsApp..."
                  className={inputClass}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStatusFiltro('Ativo')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    statusFiltro === 'Ativo'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {statusFiltro === 'Ativo' && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                  Ativos
                </button>

                <button
                  onClick={() => setStatusFiltro('Inativo')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    statusFiltro === 'Inativo'
                      ? 'bg-slate-100 text-slate-700 border border-slate-200 shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {statusFiltro === 'Inativo' && <div className="w-2 h-2 rounded-full bg-slate-400" />}
                  Inativos
                </button>
              </div>
            </div>

            {loadingLista && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <div className="w-3 h-3 border-2 border-slate-300 border-t-purple-600 rounded-full animate-spin" />
                Carregando...
              </div>
            )}

            {erroLista && (
              <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200">
                <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-xs font-medium text-rose-700">{erroLista}</p>
              </div>
            )}
          </div>
        </div>

        {/* LISTA DE PACIENTES - HIGH DENSITY */}
        <div className="pb-6 space-y-3">
          {rows.length === 0 && !loadingLista ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-slate-100">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-700">Nenhum paciente encontrado</p>
              <p className="mt-1 text-xs text-slate-500">Tente ajustar os filtros ou adicionar um novo paciente</p>
            </div>
          ) : (
            rows.map((p) => {
              const wa = p.whatsapp || p.celular || ''
              const waLink = wa ? toWhatsAppLink(wa) : null

              return (
                <div
                  key={p.id}
                  className="group relative bg-white rounded-xl p-4 shadow-sm hover:shadow-md border border-slate-100 hover:border-purple-200/60 hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* Delete Button - ADMIN only, canto inferior direito */}
                  {userRole === 'ADMIN' && (
                    <button
                      type="button"
                      onClick={() => deletarPaciente(p.id, p.nome)}
                      disabled={deletingId === p.id}
                      className="absolute bottom-2 right-2 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed z-10"
                      title="Excluir paciente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="flex items-start gap-4">
                    {/* PACIENTE INFO */}
                    <button onClick={() => openEdit(p)} className="flex-1 text-left min-w-0 group/edit">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="shrink-0 w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center group-hover/edit:bg-purple-100 transition-colors">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-bold text-slate-900 truncate group-hover/edit:text-purple-600 transition-colors">
                              {p.nome}
                            </h3>
                            {p.status === 'Ativo' ? (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                  Ativo
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                  Inativo
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-slate-600">{subtitle(p)}</p>
                        </div>
                      </div>
                    </button>

                    {/* ACTIONS */}
                    <div className="flex items-center gap-2 shrink-0">
                      {waLink && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="group/wa inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#25D366] hover:bg-[#20BA5A] text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
                          title="Abrir WhatsApp"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      )}

                      <button
                        onClick={() => openEdit(p)}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-purple-200 transition-all active:scale-95"
                        title="Editar paciente"
                      >
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* MODAL */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-white">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900">
                  {mode === 'create' ? 'Novo paciente' : 'Editar paciente'}
                </h3>
                <p className="text-xs text-slate-600 mt-1">Tecnologia premium para proteger cada informação</p>
              </div>

              <button
                onClick={closeModal}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                disabled={saving}
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 max-h-[78vh] overflow-auto bg-[#F9FAFB]">
              {erroForm && (
                <div className="mb-4 flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 shadow-sm">
                  <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-rose-900">Erro de validação</p>
                    <p className="text-xs text-rose-700 mt-0.5">{erroForm}</p>
                  </div>
                </div>
              )}

              <Section title="Dados pessoais">
                <Grid2>
                  <Field label="Nome *">
                    <input
                      ref={firstFieldRef}
                      name="nome"
                      value={form.nome || ''}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Data de nascimento">
                    <input
                      type="date"
                      name="data_nascimento"
                      value={form.data_nascimento || ''}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="CPF">
                    <input name="cpf" value={form.cpf || ''} onChange={handleChange} className={inputClass} />
                  </Field>

                  <Field label="Gênero">
                    <select
                      name="genero"
                      value={form.genero || SELECT_PLACEHOLDER_VALUE}
                      onChange={handleChange}
                      className={selectInFormClass}
                    >
                      {placeholderOption}
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Outro">Outro</option>
                      <option value="Prefiro não informar">Prefiro não informar</option>
                    </select>
                  </Field>

                  <Field label="Profissão">
                    <input name="profissao" value={form.profissao || ''} onChange={handleChange} className={inputClass} />
                  </Field>

                  <Field label="Status">
                    <select name="status" value={form.status || 'Ativo'} onChange={handleChange} className={selectInFormClass}>
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </Field>
                </Grid2>
              </Section>

              <Section title="Contato">
                <Grid2>
                  <Field label="Celular">
                    <input
                      name="celular"
                      value={form.celular || ''}
                      onChange={handleChange}
                      className={inputClass}
                      inputMode="numeric"
                      placeholder="DDD + número (somente dígitos)"
                    />
                  </Field>

                  <Field label="WhatsApp">
                    <input
                      name="whatsapp"
                      value={form.whatsapp || ''}
                      onChange={handleChange}
                      className={inputClass}
                      inputMode="numeric"
                      placeholder="DDD + número (ex: 11999999999)"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Dica: pode colar com espaços/traços — o sistema limpa automaticamente.
                    </p>
                  </Field>

                  <Field label="E-mail">
                    <input type="email" name="email" value={form.email || ''} onChange={handleChange} className={inputClass} />
                  </Field>
                </Grid2>
              </Section>

              <Section title="Endereço (ViaCEP)">
                <Grid2>
                  <Field label="CEP">
                    <input
                      name="cep"
                      value={form.cep || ''}
                      onChange={handleChange}
                      onBlur={handleCEPBlur}
                      className={inputClass}
                      placeholder="00000-000"
                    />
                  </Field>

                  <Field label="UF">
                    <input name="uf" value={form.uf || ''} onChange={handleChange} className={inputClass} />
                  </Field>

                  <Field label="Cidade">
                    <input name="cidade" value={form.cidade || ''} onChange={handleChange} className={inputClass} />
                  </Field>

                  <Field label="Logradouro">
                    <input name="logradouro" value={form.logradouro || ''} onChange={handleChange} className={inputClass} />
                  </Field>

                  <Field label="Número">
                    <input name="numero" value={form.numero || ''} onChange={handleChange} className={inputClass} />
                  </Field>

                  <Field label="Complemento">
                    <input name="complemento" value={form.complemento || ''} onChange={handleChange} className={inputClass} />
                  </Field>

                  <Field label="Bairro">
                    <input
                      name="bairro"
                      value={form.bairro || ''}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Para sítios/fazendas use 'Zona Rural'"
                    />
                  </Field>
                </Grid2>
              </Section>

              <Section title="Responsável legal (opcional)">
                <Grid2>
                  <Field label="Responsável legal nome">
                    <input
                      name="responsavel_legal_nome"
                      value={form.responsavel_legal_nome || ''}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Responsável legal CPF">
                    <input
                      name="responsavel_legal_cpf"
                      value={form.responsavel_legal_cpf || ''}
                      onChange={handleChange}
                      className={inputClass}
                      inputMode="numeric"
                    />
                  </Field>
                </Grid2>
              </Section>

              <Section title="Convênio / Particular">
                <Grid2>
                  <Field label="Convênio">
                    <div className="space-y-2">
                      {conveniosLoading ? (
                        <div className="flex items-center gap-2 py-2 text-xs text-slate-500">
                          <div className="w-3 h-3 border-2 border-slate-300 border-t-purple-500 rounded-full animate-spin" />
                          Carregando convênios...
                        </div>
                      ) : (
                        <select
                          name="convenio_id"
                          value={form.convenio_id || SELECT_PLACEHOLDER_VALUE}
                          onChange={(e) => {
                            const id = e.target.value === SELECT_PLACEHOLDER_VALUE ? '' : e.target.value
                            const found = conveniosList.find(c => c.id === id)
                            setForm(prev => ({
                              ...prev,
                              convenio_id: id,
                              convenio: found?.nome || '',
                              convenio_outro: found ? '' : prev.convenio_outro,
                              valor_sessao_override: found ? String(found.valor_sessao) : prev.valor_sessao_override,
                            }))
                          }}
                          className={selectInFormClass}
                        >
                          <option value={SELECT_PLACEHOLDER_VALUE} disabled>Selecione o convênio</option>
                          {conveniosList.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.nome}{c.valor_sessao > 0 ? ` — R$ ${c.valor_sessao.toFixed(2).replace('.', ',')}` : ''}
                            </option>
                          ))}
                          <option value="OUTRO_LIVRE">Outro (digitar manualmente)</option>
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => setMiniModalOpen(true)}
                        className="inline-flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 font-semibold transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        Criar novo convênio
                      </button>
                    </div>
                  </Field>

                  {(form.convenio_id === 'OUTRO_LIVRE' || (!form.convenio_id && form.convenio === 'Outro')) && (
                    <Field label="Convênio (digitar) *">
                      <input
                        name="convenio_outro"
                        value={form.convenio_outro || ''}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </Field>
                  )}

                  <Field label="Número do convênio">
                    <input
                      name="convenio_numero"
                      value={form.convenio_numero || ''}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Valor por sessão (opcional)">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">R$</span>
                      <input
                        name="valor_sessao_override"
                        value={form.valor_sessao_override || ''}
                        onChange={handleChange}
                        className={`${inputClass} pl-9`}
                        placeholder="Ex: 85,00"
                        inputMode="decimal"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Deixe em branco se o paciente paga pelo plano mensal do convênio</p>
                  </Field>

                  <Field label="Desconto particular (R$)">
                    <input
                      name="desconto_particular"
                      value={form.desconto_particular || ''}
                      onChange={handleChange}
                      className={inputClass}
                      inputMode="decimal"
                      placeholder="Ex: 20"
                    />
                  </Field>

                  <Field label="Justificativa">
                    <textarea
                      name="justificativa"
                      value={form.justificativa || ''}
                      onChange={handleChange}
                      className={textareaClass}
                      rows={3}
                    />
                  </Field>
                </Grid2>
              </Section>

              <Section title="Diagnóstico clínico">
                <textarea
                  name="diagnostico_clinico"
                  value={form.diagnostico_clinico || ''}
                  onChange={handleChange}
                  className={textareaClass}
                  rows={4}
                />
              </Section>

              <Section title="Plano e frequência">
                <Grid2>
                  <Field label="Plano de pagamento">
                    <select
                      name="plano_pagamento"
                      value={form.plano_pagamento || SELECT_PLACEHOLDER_VALUE}
                      onChange={handleChange}
                      className={selectInFormClass}
                    >
                      {placeholderOption}
                      <option value="Avulso">Avulso</option>
                      <option value="Mensal">Mensal</option>
                      <option value="Trimestral">Trimestral</option>
                      <option value="Semestral">Semestral</option>
                      <option value="Anual">Anual</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </Field>

                  {form.plano_pagamento === 'Outro' && (
                    <Field label="Plano (Outro) *">
                      <input
                        name="plano_pagamento_outro"
                        value={form.plano_pagamento_outro || ''}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </Field>
                  )}

                  <Field label="Frequência">
                    <select
                      name="frequencia"
                      value={form.frequencia || SELECT_PLACEHOLDER_VALUE}
                      onChange={handleChange}
                      className={selectInFormClass}
                    >
                      {placeholderOption}
                      <option value="1x">1x por semana</option>
                      <option value="2x">2x por semana</option>
                      <option value="3x">3x por semana</option>
                      <option value="Híbrido">Híbrido</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </Field>

                  {form.frequencia === 'Outro' && (
                    <Field label="Frequência (Outro) *">
                      <input
                        name="frequencia_outro"
                        value={form.frequencia_outro || ''}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Descreva a frequência..."
                      />
                    </Field>
                  )}

                  <Field label="Data de início">
                    <input
                      type="date"
                      name="plano_inicio"
                      value={form.plano_inicio || ''}
                      onChange={handleChange}
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-slate-500">Preenche automático ao selecionar um plano (editável).</p>
                  </Field>

                  <Field label="Data de fim">
                    <input
                      type="date"
                      name="plano_fim"
                      value={form.plano_fim || ''}
                      onChange={handleChange}
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Calculado pelo plano (Mensal/Trimestral/Semestral/Anual). Você pode editar.
                    </p>
                  </Field>
                </Grid2>
              </Section>
            </div>

            <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-3 bg-gradient-to-r from-slate-50 to-white">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-colors"
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                onClick={salvar}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-semibold shadow-lg shadow-purple-400/30 hover:shadow-xl hover:shadow-purple-400/40 transition-all disabled:opacity-50 active:scale-95"
                disabled={saving}
              >
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? 'Salvando...' : mode === 'create' ? 'Salvar paciente' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MINI-MODAL criar novo convênio inline */}
      {miniModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Novo Convênio</h4>
              <button onClick={() => setMiniModalOpen(false)} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome *</label>
                <input value={miniNome} onChange={e => setMiniNome(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-300/60" placeholder="Ex: Bradesco Saúde" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Valor por sessão (R$)</label>
                <input value={miniValor} onChange={e => setMiniValor(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-300/60" placeholder="0,00" inputMode="decimal" />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex gap-2">
              <button onClick={() => setMiniModalOpen(false)} className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button
                disabled={miniCriando}
                onClick={async () => {
                  if (!miniNome.trim()) return
                  setMiniCriando(true)
                  try {
                    const clinicaId = clinicaIdRef.current
                    if (!clinicaId) return
                    const valor = parseFloat(miniValor.replace(',', '.')) || 0
                    const { data: novo } = await supabase.from('convenios').insert({
                      clinica_id: clinicaId, nome: miniNome.trim(), valor_sessao: valor, cor: '#a855f7', ativo: true, is_padrao: false
                    }).select('id,nome,valor_sessao,cor,is_padrao').single()
                    if (novo) {
                      setConveniosList(prev => [...prev, novo as ConvenioItem])
                      setForm(prev => ({ ...prev, convenio_id: novo.id, convenio: novo.nome, valor_sessao_override: String(novo.valor_sessao) }))
                    }
                    setMiniModalOpen(false)
                    setMiniNome('')
                    setMiniValor('')
                  } finally {
                    setMiniCriando(false)
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold disabled:opacity-50 transition-all"
              >
                {miniCriando ? 'Criando...' : 'Criar e Selecionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
      <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-purple-500 to-purple-600" />
        {title}
      </h4>
      {children}
    </div>
  )
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
