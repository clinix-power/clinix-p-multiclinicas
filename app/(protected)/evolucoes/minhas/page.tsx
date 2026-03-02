'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, FileText, Calendar, User, Sparkles, CheckCircle } from 'lucide-react'
import PageHeader from '@/components/ui/page-header'

type PacienteMini = {
  id: string
  nome: string
  data_nascimento: string | null
  plano_pagamento: string | null
  plano_pagamento_outro: string | null
}

type Evolucao = {
  id: string
  paciente_id: string
  profissional_id: string
  clinica_id: string | null
  texto_original: string | null
  texto_melhorado_ia: string | null
  data_hora: string
}

type PerfilMini = {
  id: string
  nome: string | null
  profissao: string | null
  registro_tipo: string | null
  registro_numero: string | null
  clinica_id: string | null
}

function formatDateTimeBR(iso: string) {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} • ${hh}:${mi}`
}

function formatDateBR(yyyyMmDd: string) {
  const [y, m, d] = yyyyMmDd.split('-')
  return `${d}/${m}/${y}`
}

function clip(text: string, n = 140) {
  const t = (text || '').trim()
  if (!t) return ''
  return t.length > n ? t.slice(0, n).trimEnd() + '…' : t
}

function planoLabel(p?: PacienteMini) {
  if (!p) return ''
  if (!p.plano_pagamento) return ''
  if (p.plano_pagamento === 'Outro') {
    return p.plano_pagamento_outro ? p.plano_pagamento_outro : 'Outro'
  }
  return p.plano_pagamento
}

/** Polimento Max — bolinhas (mesmo timing/sensação da Agenda Polimento Max) */
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

export default function EvolucoesMinhasPage() {
  const router = useRouter()

  // ✅ click outside to close (details)
  const pageRef = useRef<HTMLDivElement | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)

  const [erro, setErro] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [profile, setProfile] = useState<PerfilMini | null>(null)

  const [pacientes, setPacientes] = useState<PacienteMini[]>([])
  const [qPac, setQPac] = useState('')
  const [searchGlobal, setSearchGlobal] = useState('')
  const [filterPeriodo, setFilterPeriodo] = useState<'TODOS' | 'HOJE' | 'SEMANA' | 'MES'>('TODOS')

  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([])

  // Modal
  const [open, setOpen] = useState(false)
  const [pacienteId, setPacienteId] = useState<string>('')

  // ✅ UX A
  const [lockPaciente, setLockPaciente] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const [textoOriginal, setTextoOriginal] = useState('')
  const [textoIA, setTextoIA] = useState<string>('')

  // ✅ Toast premium (msg): sobe, fica 4s e some
  const [toastOpen, setToastOpen] = useState(false)
  const [toastLeaving, setToastLeaving] = useState(false)

  function closeToast() {
    if (!toastOpen) return
    setToastLeaving(true)
    window.setTimeout(() => {
      setToastOpen(false)
      setToastLeaving(false)
      setMsg(null)
    }, 220)
  }

  useEffect(() => {
    if (!msg) return
    setToastOpen(true)
    setToastLeaving(false)
    const t = window.setTimeout(() => closeToast(), 4000)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msg])

  async function carregar() {
    setLoading(true)
    setErro(null)
    setMsg(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id

      if (!userId) {
        setErro('Sessão expirada. Faça login novamente.')
        setLoading(false)
        return
      }

      const { data: profData, error: profErr } = await supabase
        .from('profiles')
        .select('id,nome,registro_tipo,registro_numero,clinica_id')
        .eq('id', userId)
        .single()

      if (profErr) throw profErr
      setProfile(profData as PerfilMini)

      const { data: evoData, error: evoErr } = await supabase
        .from('evolucoes_clinicas')
        .select('id,paciente_id,profissional_id,clinica_id,texto_original,texto_melhorado_ia,data_hora')
        .eq('profissional_id', userId)
        .order('data_hora', { ascending: false })

      if (evoErr) throw evoErr
      setEvolucoes((evoData ?? []) as Evolucao[])

      const { data: pacData, error: pacErr } = await supabase
        .from('pacientes')
        .select('id,nome,data_nascimento,plano_pagamento,plano_pagamento_outro')
        .eq('clinica_id', profData.clinica_id)
        .order('nome', { ascending: true })

      if (pacErr) throw pacErr
      setPacientes((pacData ?? []) as PacienteMini[])
    } catch (e: any) {
      console.error('[evolucoes-minhas] carregar erro', e)
      setErro(e?.message || 'Erro ao carregar evoluções.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const assinatura = useMemo(() => {
    const n = (profile?.nome ?? '').trim()
    const p = (profile?.profissao ?? '').trim()
    const rt = (profile?.registro_tipo ?? '').trim()
    const rn = (profile?.registro_numero ?? '').trim()
    const parts = [n, p].filter(Boolean)
    const reg = [rt, rn].filter(Boolean).join(' ')
    const line = parts.join(' • ')
    return reg ? `${line} • ${reg}` : line
  }, [profile])

  const pacienteMap = useMemo(() => {
    const m = new Map<string, PacienteMini>()
    for (const p of pacientes) m.set(p.id, p)
    return m
  }, [pacientes])

  const pacienteSelecionado = useMemo(
    () => pacienteMap.get(pacienteId) || null,
    [pacienteMap, pacienteId]
  )

  const pacientesFiltrados = useMemo(() => {
    const q = qPac.trim().toLowerCase()
    if (!q) return pacientes.slice(0, 14)
    return pacientes.filter((p) => p.nome.toLowerCase().includes(q)).slice(0, 14)
  }, [pacientes, qPac])

  const evolucoesPorPaciente = useMemo(() => {
    const grouped = new Map<string, Evolucao[]>()
    for (const e of evolucoes) {
      const arr = grouped.get(e.paciente_id) || []
      arr.push(e)
      grouped.set(e.paciente_id, arr)
    }
    for (const [k, arr] of grouped.entries()) {
      arr.sort((a, b) => Date.parse(b.data_hora) - Date.parse(a.data_hora))
      grouped.set(k, arr)
    }
    return grouped
  }, [evolucoes])

  const pacientesComEvolucao = useMemo(() => {
    const ids = Array.from(evolucoesPorPaciente.keys())
    let list = ids.map((id) => pacienteMap.get(id)).filter(Boolean) as PacienteMini[]
    
    // Filtro de busca global
    if (searchGlobal.trim()) {
      const q = searchGlobal.trim().toLowerCase()
      list = list.filter(p => p.nome.toLowerCase().includes(q))
    }
    
    // Filtro de período
    if (filterPeriodo !== 'TODOS') {
      const now = new Date()
      const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const semanaAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000)
      const mesAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      list = list.filter(p => {
        const evos = evolucoesPorPaciente.get(p.id) || []
        if (evos.length === 0) return false
        const ultimaData = new Date(evos[0].data_hora)
        
        if (filterPeriodo === 'HOJE') return ultimaData >= hoje
        if (filterPeriodo === 'SEMANA') return ultimaData >= semanaAtras
        if (filterPeriodo === 'MES') return ultimaData >= mesAtras
        return true
      })
    }
    
    list.sort((a, b) => a.nome.localeCompare(b.nome))
    return list
  }, [evolucoesPorPaciente, pacienteMap, searchGlobal, filterPeriodo])

  function abrirModalNovoGeral() {
    setErro(null)
    setMsg(null)
    setOpen(true)
    setLockPaciente(false)
    setPickerOpen(false)
    setPacienteId('')
    setQPac('')
    setTextoOriginal('')
    setTextoIA('')
  }

  function abrirModalParaPaciente(p: PacienteMini) {
    setErro(null)
    setMsg(null)
    setOpen(true)
    setLockPaciente(true)
    setPickerOpen(false)
    setPacienteId(p.id)
    setQPac('')
    setTextoOriginal('')
    setTextoIA('')
  }

  function fecharModal() {
    setOpen(false)
    setPickerOpen(false)
  }

  async function gerarIA() {
    setErro(null)
    setMsg(null)

    const orig = textoOriginal.trim()
    if (!orig) {
      setErro('Digite o texto original antes de gerar com IA.')
      return
    }
    if (!pacienteId) {
      setErro('Selecione um paciente.')
      return
    }

    const p = pacienteMap.get(pacienteId)
    if (!p) {
      setErro('Paciente inválido.')
      return
    }

    setGenerating(true)
    try {
      const payload = {
        original: orig,
        assinatura: assinatura || null,
        paciente: {
          id: p.id,
          nome: p.nome,
          data_nascimento: p.data_nascimento,
        },
      }

      const res = await fetch('/api/ollama/evolucao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        const msgErr =
          (data && typeof data?.error === 'string' && data.error) ||
          `Falha ao gerar com IA (${res.status}).`
        throw new Error(msgErr)
      }

      const out = data && typeof data?.text === 'string' && data.text ? data.text : ''
      if (!out.trim()) throw new Error('A IA não retornou texto.')

      setTextoIA(out.trim())
      setMsg('Texto gerado com IA. Revise e salve quando estiver ok.')
    } catch (e: any) {
      console.error('[evolucoes-minhas] gerarIA erro', e)
      setErro(e?.message || 'Erro ao gerar com IA.')
    } finally {
      setGenerating(false)
    }
  }

  async function salvar() {
    setErro(null)
    setMsg(null)

    const orig = textoOriginal.trim()
    if (!pacienteId) {
      setErro('Selecione um paciente.')
      return
    }
    if (!orig) {
      setErro('O texto original é obrigatório.')
      return
    }

    setSaving(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (!userId) {
        setErro('Sessão expirada. Faça login novamente.')
        setSaving(false)
        return
      }

      // Obter clinica_id do profile (necessário para RLS)
      const { data: myProf } = await supabase
        .from('profiles')
        .select('clinica_id')
        .eq('id', userId)
        .single()

      const { error } = await supabase.from('evolucoes_clinicas').insert({
        paciente_id: pacienteId,
        profissional_id: userId,
        clinica_id: myProf?.clinica_id,
        texto_original: orig,
        texto_melhorado_ia: textoIA ? textoIA : null,
      })

      if (error) throw error

      setMsg('Evolução salva com sucesso!')
      fecharModal()
      await carregar()
    } catch (e: any) {
      console.error('[evolucoes-minhas] salvar erro', e)
      setErro(e?.message || 'Erro ao salvar evolução.')
    } finally {
      setSaving(false)
    }
  }

  // ✅ click outside to close (details) — fecha cards ao clicar no vazio
  useEffect(() => {
    function closeAllDetails() {
      const root = pageRef.current
      if (!root) return
      const opened = root.querySelectorAll('details[open]')
      opened.forEach((d) => d.removeAttribute('open'))
    }

    function onPointerDown(ev: PointerEvent) {
      if (open) return

      const root = pageRef.current
      if (!root) return

      const target = ev.target as HTMLElement | null
      if (!target) return

      if (target.closest('details')) return
      if (!root.contains(target)) return

      closeAllDetails()
    }

    document.addEventListener('pointerdown', onPointerDown, { capture: true })
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, { capture: true } as any)
    }
  }, [open])

  function PacienteHeader({ p }: { p: PacienteMini }) {
    return (
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900 truncate">{p.nome}</div>
        <div className="mt-1 text-xs text-slate-600 truncate">
          {p.data_nascimento ? `Nasc.: ${formatDateBR(p.data_nascimento)}` : 'Nasc.: —'}
          {p.plano_pagamento ? ` • Plano: ${planoLabel(p)}` : ''}
        </div>
      </div>
    )
  }

  // ✅ Reutilizáveis (Polimento Max - Estilo de Luxo)
  const luxuryCard = 'rounded-[32px] bg-white/80 backdrop-blur-md border border-white/20 shadow-xl transition-all hover:shadow-2xl overflow-hidden'
  const luxuryBtnPrimary = 'h-12 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-2xl shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 px-6'
  const luxuryBtnSecondary = 'h-12 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 rounded-2xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 px-6'
  
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Toast premium (msg) */}
      {(toastOpen || msg) && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] px-4 w-full max-w-2xl">
          <div
            className={[
              'w-full rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800',
              'shadow-[0_10px_30px_rgba(2,6,23,0.10)]',
              'px-4 py-3 flex items-start justify-between gap-3',
              'transition-all duration-200',
              toastLeaving ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0',
            ].join(' ')}
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold">Pronto</div>
              <div className="text-sm mt-0.5 break-words">{msg}</div>
            </div>

            <button
              type="button"
              onClick={closeToast}
              className="shrink-0 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* CONTAINER PRINCIPAL (PADRONIZAÇÃO 1 MILHÃO) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* HEADER UNIFICADO DE LUXO */}
        <PageHeader 
          title="Evoluções" 
          subtitle="Registro clínico e gestão de histórico por paciente"
          icon={FileText}
          showBackButton={true}
          action={
            <button
              type="button"
              onClick={abrirModalNovoGeral}
              className={luxuryBtnPrimary}
            >
              <FileText className="w-5 h-5" />
              <span className="hidden sm:inline">Nova Evolução</span>
              <span className="sm:hidden">Nova</span>
            </button>
          }
        />

        {/* SEARCH & FILTERS - Sticky no Mobile */}
        <div className="sticky top-0 z-20 bg-[#F8FAFC] pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchGlobal}
                onChange={(e) => setSearchGlobal(e.target.value)}
                placeholder="Buscar paciente..."
                className="w-full h-12 pl-12 pr-4 rounded-2xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition text-sm shadow-sm"
              />
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            </div>
            
            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(['TODOS', 'HOJE', 'SEMANA', 'MES'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterPeriodo(f)}
                  className={`h-12 px-4 rounded-2xl text-xs font-bold transition-all whitespace-nowrap border ${
                    filterPeriodo === f
                      ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/20'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-purple-200'
                  }`}
                >
                  {f === 'TODOS' ? 'Todos' : f === 'HOJE' ? 'Hoje' : f === 'SEMANA' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {erro && (
          <div className="mb-8 p-4 rounded-[24px] bg-rose-50 border border-rose-200 shadow-sm flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <p className="text-sm text-rose-700 font-medium">{erro}</p>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <AnimatedDots />
            <p className="text-sm text-slate-500 mt-4">Carregando evoluções...</p>
          </div>
        ) : (
          /* LAYOUT RESPONSIVO: Flex-col no Mobile / Grid no Desktop */
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">
            
            {/* --- MOBILE VIEW (Lista Expansível) --- */}
            <div className="md:hidden space-y-6">
               {pacientesComEvolucao.length === 0 ? (
                <div className={`${luxuryCard} p-12 text-center`}>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-purple-50 flex items-center justify-center">
                    <FileText className="w-10 h-10 text-purple-300" />
                  </div>
                  <p className="text-base text-slate-900 font-semibold mb-2">
                    {searchGlobal || filterPeriodo !== 'TODOS' ? 'Nenhum resultado encontrado' : 'Nenhuma evolução registrada'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {searchGlobal || filterPeriodo !== 'TODOS' ? 'Tente ajustar os filtros de busca' : 'Comece criando uma nova evolução'}
                  </p>
                </div>
              ) : (
                pacientesComEvolucao.map((p) => {
                  const arr = evolucoesPorPaciente.get(p.id) || []
                  const last = arr[0]
                  return (
                    <details key={p.id} className={`${luxuryCard} group`}>
                      <summary className="cursor-pointer select-none px-6 py-5 hover:bg-slate-50/50 transition flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center shrink-0">
                             <User className="w-5 h-5 text-purple-500" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 truncate">{p.nome}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{arr.length} evoluções</div>
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {last?.data_hora && (
                            <span className="text-[10px] px-2 py-1 rounded-full border border-purple-100 text-purple-700 bg-purple-50 font-medium">
                              {formatDateTimeBR(last.data_hora)}
                            </span>
                          )}
                          <div className="transition-transform duration-300 group-open:rotate-180 text-slate-400">⌄</div>
                        </div>
                      </summary>

                      <div className="px-6 pb-6 pt-2 border-t border-slate-100/50">
                        <button
                          type="button"
                          onClick={() => abrirModalParaPaciente(p)}
                          className="w-full h-12 mb-4 text-sm font-bold border border-purple-200 bg-purple-50 text-purple-700 rounded-2xl hover:bg-purple-100 transition active:scale-[0.98]"
                        >
                          + Nova evolução deste paciente
                        </button>

                        <div className="space-y-4">
                          {arr.map((e) => (
                            <div key={e.id} className="rounded-2xl border border-slate-200 bg-white/50 p-4 hover:shadow-md transition">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                                <span className="text-xs font-bold text-slate-700">{formatDateTimeBR(e.data_hora)}</span>
                              </div>
                              
                              {e.texto_original && (
                                <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                                  {e.texto_original}
                                </div>
                              )}
                              
                              {e.texto_melhorado_ia && (
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                  <div className="flex items-center gap-1.5 mb-1 text-purple-600 text-xs font-bold">
                                    <Sparkles className="w-3 h-3" />
                                    <span>IA Melhorada</span>
                                  </div>
                                  <div className="text-sm text-slate-700 bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                                    {e.texto_melhorado_ia}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  )
                })
              )}
            </div>

            {/* --- DESKTOP VIEW (Grid) --- */}
            <div className="hidden md:contents">
              {pacientesComEvolucao.length === 0 ? (
                <div className="col-span-12 bg-white/80 backdrop-blur-md rounded-[32px] shadow-xl border border-white/20 p-16 text-center">
                  <div className="w-24 h-24 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-12 h-12 text-purple-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {searchGlobal || filterPeriodo !== 'TODOS' ? 'Nenhum resultado encontrado' : 'Nenhuma evolução registrada'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {searchGlobal || filterPeriodo !== 'TODOS' ? 'Tente ajustar os filtros de busca ou limpar a pesquisa' : 'Comece criando um novo registro clínico clicando no botão acima'}
                  </p>
                </div>
              ) : (
                <>
                  {/* SIDEBAR (Col-4): Lista de Pacientes */}
                  <div className="lg:col-span-4 space-y-4 h-fit sticky top-24">
                    <div className="px-2 mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pacientes</h3>
                      <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {pacientesComEvolucao.length}
                      </span>
                    </div>
                    
                    <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
                      {pacientesComEvolucao.map((p) => {
                        const arr = evolucoesPorPaciente.get(p.id) || []
                        const last = arr[0]
                        return (
                          <div 
                            key={p.id} 
                            onClick={() => abrirModalParaPaciente(p)}
                            className={`${luxuryCard} p-4 cursor-pointer hover:border-purple-300 hover:shadow-purple-500/10 active:scale-[0.98] group`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-purple-50 group-hover:bg-purple-100 transition flex items-center justify-center shrink-0">
                                <User className="w-5 h-5 text-purple-500 group-hover:text-purple-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-slate-900 truncate">{p.nome}</div>
                                <div className="text-xs text-slate-500">{arr.length} registros</div>
                              </div>
                            </div>
                            {last?.data_hora && (
                              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] font-medium text-slate-400">Última:</span>
                                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                                  {formatDateTimeBR(last.data_hora)}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* MAIN CONTENT (Col-8): Detalhes Expandidos */}
                  <div className="lg:col-span-8 space-y-6">
                    <div className={`${luxuryCard} p-8 min-h-[500px]`}>
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500 shadow-lg shadow-purple-500/30 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Histórico Completo</h2>
                          <p className="text-sm text-slate-500">Detalhes das evoluções por paciente</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {pacientesComEvolucao.map((p) => {
                          const arr = evolucoesPorPaciente.get(p.id) || []
                          return (
                            <details key={p.id} className="group rounded-[24px] border border-slate-200 bg-slate-50/50 overflow-hidden">
                              <summary className="cursor-pointer select-none px-6 py-5 hover:bg-white transition flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 shadow-sm">
                                    {p.nome.charAt(0)}
                                  </div>
                                  <div>
                                    <h3 className="text-base font-bold text-slate-900">{p.nome}</h3>
                                    <div className="text-xs text-slate-500 flex items-center gap-2">
                                      <span>Nasc: {p.data_nascimento ? formatDateBR(p.data_nascimento) : 'N/A'}</span>
                                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                                      <span>{planoLabel(p)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
                                    {arr.length} evoluções
                                  </span>
                                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center transition-transform duration-300 group-open:rotate-180">
                                    <span className="text-slate-500 text-xs">▼</span>
                                  </div>
                                </div>
                              </summary>

                              <div className="px-6 pb-6 pt-2 border-t border-slate-200/50 bg-white">
                                <div className="flex justify-end mb-6 pt-4">
                                  <button
                                    onClick={() => abrirModalParaPaciente(p)}
                                    className="text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-xl transition flex items-center gap-2"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Adicionar Evolução
                                  </button>
                                </div>

                                <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 pl-8 pb-4">
                                  {arr.map((e) => (
                                    <div key={e.id} className="relative">
                                      {/* Timeline dot */}
                                      <div className="absolute -left-[41px] top-0 w-5 h-5 rounded-full border-4 border-white bg-purple-500 shadow-sm" />
                                      
                                      <div className="mb-2 flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-900">
                                          {formatDateTimeBR(e.data_hora).split('•')[0]}
                                        </span>
                                        <span className="text-xs font-medium text-slate-500">
                                          {formatDateTimeBR(e.data_hora).split('•')[1]}
                                        </span>
                                      </div>

                                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-purple-100 hover:shadow-sm transition">
                                        {e.texto_original && (
                                          <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                            {e.texto_original}
                                          </div>
                                        )}
                                        
                                        {e.texto_melhorado_ia && (
                                          <div className="mt-4 bg-white rounded-xl p-4 border border-purple-100 shadow-sm">
                                            <div className="flex items-center gap-2 mb-2 text-purple-600">
                                              <Sparkles className="w-4 h-4" />
                                              <span className="text-xs font-bold uppercase tracking-wider">IA Refined</span>
                                            </div>
                                            <div className="text-sm text-slate-700 whitespace-pre-wrap">
                                              {e.texto_melhorado_ia}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </details>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL (Preservado e Estilizado) */}
      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) fecharModal()
          }}
        >
          <div className="w-full max-w-2xl bg-white rounded-[32px] shadow-2xl border border-white/50 max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0 bg-slate-50/50">
              <div className="min-w-0">
                <div className="text-xl font-bold text-slate-900">Nova evolução</div>
                <div className="text-sm text-slate-500 mt-1">
                  Selecione o paciente e registre o texto clínico.
                </div>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
                disabled={saving || generating}
              >
                ✕
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-auto flex-1 custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Paciente *</label>

                {lockPaciente && pacienteSelecionado ? (
                  <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4 flex items-start justify-between gap-3">
                    <PacienteHeader p={pacienteSelecionado} />
                    <button
                      type="button"
                      className="text-xs font-bold text-purple-600 hover:text-purple-700"
                      onClick={() => {
                        setLockPaciente(false)
                        setPickerOpen(true)
                      }}
                      disabled={saving || generating}
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white transition px-4 py-3 flex items-center justify-between text-left focus:ring-2 focus:ring-purple-500/20 outline-none"
                      onClick={() => setPickerOpen((v) => !v)}
                      disabled={saving || generating}
                    >
                      <div className="text-sm text-slate-700">
                        {pacienteSelecionado ? (
                          <>
                            <span className="font-bold text-slate-900">
                              {pacienteSelecionado.nome}
                            </span>
                            <span className="text-slate-500 text-xs ml-2">
                              {pacienteSelecionado.data_nascimento
                                ? `• Nasc.: ${formatDateBR(pacienteSelecionado.data_nascimento)}`
                                : ''}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400">Selecionar paciente...</span>
                        )}
                      </div>
                      <div className="text-slate-400 text-xs">▼</div>
                    </button>

                    {pickerOpen && (
                      <div className="absolute top-full left-0 w-full mt-2 z-10 rounded-2xl border border-slate-200 bg-white shadow-xl p-4">
                        <input
                          value={qPac}
                          onChange={(e) => setQPac(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500/20 mb-3 text-sm"
                          placeholder="Buscar paciente por nome..."
                          disabled={saving || generating}
                          autoFocus
                        />

                        <div className="max-h-56 overflow-auto custom-scrollbar space-y-1">
                          {pacientesFiltrados.length === 0 ? (
                            <div className="p-3 text-sm text-slate-400 text-center">Nenhum paciente encontrado.</div>
                          ) : (
                            pacientesFiltrados.map((p) => {
                              const active = pacienteId === p.id
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setPacienteId(p.id)
                                    setPickerOpen(false)
                                  }}
                                  disabled={saving || generating}
                                  className={[
                                    'w-full text-left px-4 py-3 rounded-xl transition flex items-center justify-between',
                                    active ? 'bg-purple-50 text-purple-900' : 'hover:bg-slate-50 text-slate-700',
                                  ].join(' ')}
                                >
                                  <div>
                                    <div className="text-sm font-bold">{p.nome}</div>
                                    <div className="text-xs opacity-70">
                                      {p.data_nascimento
                                        ? `Nasc.: ${formatDateBR(p.data_nascimento)}`
                                        : 'Nasc.: —'}
                                    </div>
                                  </div>
                                  {active && <CheckCircle className="w-4 h-4 text-purple-600" />}
                                </button>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Texto original *</label>
                <textarea
                  value={textoOriginal}
                  onChange={(e) => setTextoOriginal(e.target.value)}
                  className="w-full h-48 px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-y transition text-sm leading-relaxed"
                  placeholder="Descreva a evolução clínica do paciente..."
                  disabled={saving || generating}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                <button
                  type="button"
                  onClick={gerarIA}
                  disabled={generating || saving}
                  className="w-full sm:w-auto px-6 h-10 text-xs font-bold border border-purple-200 bg-white text-purple-700 rounded-xl hover:bg-purple-50 transition inline-flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  {generating ? 'Gerando...' : 'Melhorar com IA'}
                </button>

                <div className="text-[10px] text-purple-600/70 font-medium text-center sm:text-right">
                  A IA melhora a gramática e clareza do texto.
                </div>
              </div>

              {textoIA && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Sugestão da IA
                    </label>
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-slate-800 rounded-2xl border border-purple-200 bg-purple-50 p-5 leading-relaxed shadow-inner">
                    {textoIA}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={fecharModal}
                className="w-full sm:w-auto px-6 h-12 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                disabled={saving || generating}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={salvar}
                disabled={saving || generating}
                className="w-full sm:w-auto px-8 h-12 text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition disabled:opacity-50 inline-flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <FileText className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar Evolução'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}