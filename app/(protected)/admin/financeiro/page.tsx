'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, ReferenceLine,
} from 'recharts'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Calendar, DollarSign, Loader2, Plus, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Plano = { nome: string; recursos: Record<string, boolean> }
type Clinica = { id: string; plano_id: string | null; planos: Plano | null }

type Lancamento = {
  id: string
  tipo: 'RECEITA' | 'DESPESA'
  categoria: string
  descricao: string | null
  valor: number
  data_lancamento: string
  status: 'CONFIRMADO' | 'PENDENTE' | 'CANCELADO'
  convenio_id: string | null
  paciente_id: string | null
}

type ConvenioStat = {
  id: string
  nome: string
  cor: string
  pacientes_ativos: number
  sessoes_mes: number
  receita_total: number
  percentual: number
}

type PacienteRisco = {
  id: string
  nome: string
  whatsapp: string | null
  ultimo_atendimento: string | null
  tipo: 'risco' | 'perdido'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtMes(iso: string) {
  const [y, m] = iso.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[parseInt(m) - 1]}/${y.slice(2)}`
}
function todayISO() {
  return new Date().toISOString().split('T')[0]
}
function firstDayOfMonth(iso?: string) {
  const d = iso ? new Date(iso) : new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-01`
}
function subtractMonths(n: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  d.setDate(1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-01`
}

// ─── Tax Calendar ─────────────────────────────────────────────────────────────
function getTaxEvents() {
  const hoje = new Date()
  const y = hoje.getFullYear()
  const m = hoje.getMonth() + 1
  const events: { nome: string; data: Date; tipo: string }[] = []

  // DAS MEI/Simples — dia 20
  for (let i = 0; i < 2; i++) {
    const dm = m + i
    const dy = dm > 12 ? y + 1 : y
    const dmo = dm > 12 ? dm - 12 : dm
    events.push({ nome: 'DAS MEI / Simples Nacional', data: new Date(dy, dmo - 1, 20), tipo: 'DAS' })
  }
  // ISS — dia 10
  for (let i = 0; i < 2; i++) {
    const dm = m + i
    const dy = dm > 12 ? y + 1 : y
    const dmo = dm > 12 ? dm - 12 : dm
    events.push({ nome: 'ISS Municipal', data: new Date(dy, dmo - 1, 10), tipo: 'ISS' })
  }
  // IRPF trimestral
  const irpfMonths = [3, 6, 9, 12]
  for (const im of irpfMonths) {
    const dy = im < m ? y + 1 : y
    events.push({ nome: 'IRPF Trimestral (carnê-leão)', data: new Date(dy, im - 1, 30), tipo: 'IRPF' })
  }

  return events
    .filter(e => e.data >= hoje)
    .sort((a, b) => a.data.getTime() - b.data.getTime())
    .slice(0, 6)
}

function daysDiff(d: Date) {
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// ─── Upgrade Screen ───────────────────────────────────────────────────────────
function UpgradeScreen() {
  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center shadow-lg shadow-purple-200/50">
          <DollarSign className="w-10 h-10 text-purple-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Dashboard Financeiro</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          Disponível nos planos <span className="font-semibold text-purple-600">PRO</span> e <span className="font-semibold text-purple-600">ULTIMATE</span>.
          Tenha controle total das suas finanças, alertas de retenção de pacientes, relatórios por convênio e muito mais.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-8 text-left">
          {[
            'KPIs em tempo real', 'Gráficos de evolução financeira',
            'Fluxo de caixa diário', 'Radar de retenção de pacientes',
            'Relatório por convênio', 'Calendário fiscal',
            'Lançamentos financeiros', 'IA Consultora (Ultimate)',
          ].map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-slate-700">
              <div className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
              </div>
              {f}
            </div>
          ))}
        </div>
        <a
          href="/checkout"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 text-white font-bold shadow-lg shadow-purple-400/40 hover:shadow-xl hover:shadow-purple-400/50 transition-all active:scale-95"
        >
          Fazer upgrade agora →
        </a>
      </div>
    </div>
  )
}

// ─── Modal Novo Lançamento ────────────────────────────────────────────────────
type ModalLancamentoProps = {
  clinicaId: string
  onClose: () => void
  onSaved: () => void
}
function ModalLancamento({ clinicaId, onClose, onSaved }: ModalLancamentoProps) {
  const [tipo, setTipo] = useState<'RECEITA' | 'DESPESA'>('RECEITA')
  const [categoria, setCategoria] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(todayISO())
  const [status, setStatus] = useState<'CONFIRMADO' | 'PENDENTE'>('CONFIRMADO')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const categoriasReceita = ['Sessão Particular','Sessão Convênio','Avaliação','Procedimento','Outros']
  const categoriasDespesa = ['Aluguel','Salário','Material','Equipamento','Marketing','Impostos','Outros']

  async function salvar() {
    if (!categoria || !valor) { setErro('Preencha categoria e valor.'); return }
    setSaving(true)
    setErro(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Sessão expirada. Faça login novamente.')

      const res = await fetch('/api/financeiro/lancamentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tipo,
          categoria,
          descricao: descricao || null,
          valor: parseFloat(valor.replace(',', '.')),
          data_lancamento: data,
          status,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erro ao salvar.')
      onSaved()
      onClose()
    } catch (e: any) {
      setErro(e?.message || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-white">
          <h3 className="font-bold text-slate-900">Novo Lançamento</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {erro && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">{erro}</div>}
          
          <div className="flex gap-2">
            {(['RECEITA', 'DESPESA'] as const).map(t => (
              <button key={t} onClick={() => { setTipo(t); setCategoria('') }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  tipo === t
                    ? t === 'RECEITA' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-400/30' : 'bg-rose-500 text-white shadow-lg shadow-rose-400/30'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>{t}</button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Categoria *</label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-300/60">
              <option value="">Selecione...</option>
              {(tipo === 'RECEITA' ? categoriasReceita : categoriasDespesa).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Valor (R$) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
              <input value={valor} onChange={e => setValor(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-300/60"
                placeholder="0,00" inputMode="decimal" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Data</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-300/60" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-300/60">
                <option value="CONFIRMADO">Confirmado</option>
                <option value="PENDENTE">Pendente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Descrição</label>
            <input value={descricao} onChange={e => setDescricao(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-300/60"
              placeholder="Opcional..." />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button onClick={salvar} disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white text-sm font-semibold shadow-lg disabled:opacity-50 transition-all active:scale-95">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FinanceiroPage() {
  const clinicaIdRef = useRef<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [temAcesso, setTemAcesso] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  // KPI data
  const [receitaMes, setReceitaMes] = useState(0)
  const [despesaMes, setDespesaMes] = useState(0)
  const [receitaMesAnterior, setReceitaMesAnterior] = useState(0)
  const [sessoesMes, setSessoesMes] = useState(0)

  // Charts
  const [evolucao6m, setEvolucao6m] = useState<{mes: string; receita: number; despesa: number}[]>([])
  const [fluxoDiario, setFluxoDiario] = useState<{dia: string; saldo: number; negativo: boolean}[]>([])

  // Retenção
  const [pacientesRisco, setPacientesRisco] = useState<PacienteRisco[]>([])

  // Convênios
  const [convenioStats, setConvenioStats] = useState<ConvenioStat[]>([])

  // Lançamentos recentes
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])

  const saldoLiquido = receitaMes - despesaMes
  const ticketMedio = sessoesMes > 0 ? receitaMes / sessoesMes : 0
  const variacaoReceita = receitaMesAnterior > 0 ? ((receitaMes - receitaMesAnterior) / receitaMesAnterior) * 100 : 0

  const taxEvents = useMemo(() => getTaxEvents(), [])

  async function loadData() {
    setLoading(true)
    try {
      // 1. Verificar acesso
      const { data: s } = await supabase.auth.getSession()
      const userId = s.session?.user?.id
      if (!userId) return

      const { data: prof } = await supabase.from('profiles').select('clinica_id').eq('id', userId).single()
      const clinicaId = prof?.clinica_id
      if (!clinicaId) return
      clinicaIdRef.current = clinicaId

      const { data: clinicaData } = await supabase
        .from('clinicas')
        .select('id, plano_id, planos(nome, recursos)')
        .eq('id', clinicaId)
        .single()

      const plano = (clinicaData as any)?.planos as Plano | null
      const recursos = plano?.recursos || {}
      const planoNome = plano?.nome
      
      console.log('[financeiro] Verificação de acesso:', {
        clinicaId,
        planoNome,
        recursos,
        temRecurso: recursos.gestao_financeira_completa,
        clinicaData
      })
      
      // Libera acesso para ULTIMATE, TESTE_INTERNO, PRO ou quem tem o recurso
      if (!recursos.gestao_financeira_completa && planoNome !== 'ULTIMATE' && planoNome !== 'TESTE_INTERNO' && planoNome !== 'PRO') {
        console.error('[financeiro] ACESSO NEGADO - Plano:', planoNome, 'Recursos:', recursos)
        setTemAcesso(false)
        setLoading(false)
        return
      }
      console.log('[financeiro] ✅ ACESSO LIBERADO')
      setTemAcesso(true)

      // 2. Datas úteis
      const hoje = todayISO()
      const inicioMes = firstDayOfMonth()
      const inicioMesAnt = subtractMonths(1)
      const fimMesAnt = firstDayOfMonth()
      const inicio6m = subtractMonths(5)

      // 3. Lançamentos do mês atual
      const { data: lancMes } = await supabase
        .from('lancamentos_financeiros')
        .select('*')
        .eq('clinica_id', clinicaId)
        .gte('data_lancamento', inicioMes)
        .lte('data_lancamento', hoje)
        .eq('status', 'CONFIRMADO')
        .order('data_lancamento', { ascending: false })

      const lancs = (lancMes || []) as Lancamento[]
      const rec = lancs.filter(l => l.tipo === 'RECEITA').reduce((s, l) => s + l.valor, 0)
      const desp = lancs.filter(l => l.tipo === 'DESPESA').reduce((s, l) => s + l.valor, 0)
      setReceitaMes(rec)
      setDespesaMes(desp)
      setLancamentos(lancs.slice(0, 10))

      // 4. Receita mês anterior
      const { data: lancAnt } = await supabase
        .from('lancamentos_financeiros')
        .select('valor')
        .eq('clinica_id', clinicaId)
        .eq('tipo', 'RECEITA')
        .gte('data_lancamento', inicioMesAnt)
        .lt('data_lancamento', fimMesAnt)
        .eq('status', 'CONFIRMADO')
      setReceitaMesAnterior((lancAnt || []).reduce((s, l) => s + l.valor, 0))

      // 5. Sessões do mês (agendamentos REALIZADO)
      const { count: sessoes } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact', head: true })
        .eq('clinica_id', clinicaId)
        .eq('status', 'REALIZADO')
        .gte('data', inicioMes)
        .lte('data', hoje)
      setSessoesMes(sessoes || 0)

      // 6. Evolução 6 meses
      const { data: lancs6m } = await supabase
        .from('lancamentos_financeiros')
        .select('tipo, valor, data_lancamento')
        .eq('clinica_id', clinicaId)
        .gte('data_lancamento', inicio6m)
        .lte('data_lancamento', hoje)
        .eq('status', 'CONFIRMADO')

      const mesesMap: Record<string, { receita: number; despesa: number }> = {}
      ;(lancs6m || []).forEach((l: any) => {
        const mesKey = l.data_lancamento.slice(0, 7)
        if (!mesesMap[mesKey]) mesesMap[mesKey] = { receita: 0, despesa: 0 }
        if (l.tipo === 'RECEITA') mesesMap[mesKey].receita += l.valor
        else mesesMap[mesKey].despesa += l.valor
      })
      const evo = Object.entries(mesesMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mes, v]) => ({ mes: fmtMes(mes + '-01'), receita: v.receita, despesa: v.despesa }))
      setEvolucao6m(evo)

      // 7. Fluxo de caixa diário (mês atual)
      const diasMes: Record<string, number> = {}
      lancs.forEach(l => {
        const dia = l.data_lancamento
        if (!diasMes[dia]) diasMes[dia] = 0
        diasMes[dia] += l.tipo === 'RECEITA' ? l.valor : -l.valor
      })
      let acum = 0
      const fluxo = Object.entries(diasMes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dia, v]) => {
          acum += v
          return { dia: dia.slice(8) + '/' + dia.slice(5, 7), saldo: acum, negativo: acum < 0 }
        })
      setFluxoDiario(fluxo)

      // 8. Radar de retenção — pacientes sem atendimento +30 dias
      const trinta = new Date()
      trinta.setDate(trinta.getDate() - 30)
      const trintaISO = trinta.toISOString().split('T')[0]
      const inicioMesObj = new Date(inicioMes)

      try {
        const { data: pacAtivos } = await supabase
          .from('pacientes')
          .select('id, nome, whatsapp, updated_at')
          .eq('clinica_id', clinicaId)
          .eq('status', 'Ativo')

        const { data: pacInativos } = await supabase
          .from('pacientes')
          .select('id, nome, whatsapp, updated_at')
          .eq('clinica_id', clinicaId)
          .eq('status', 'Inativo')
          .gte('updated_at', inicioMes)

        const { data: agsRecentes } = await supabase
          .from('agendamentos')
          .select('paciente_id, data')
          .eq('clinica_id', clinicaId)
          .gte('data', trintaISO)
          .in('status', ['REALIZADO', 'PENDENTE', 'CONFIRMADO'])

        const comAtividade = new Set((agsRecentes || []).map((a: any) => a.paciente_id))

        const risco: PacienteRisco[] = (pacAtivos || [])
          .filter((p: any) => !comAtividade.has(p.id))
          .map((p: any) => ({ id: p.id, nome: p.nome, whatsapp: p.whatsapp, ultimo_atendimento: p.updated_at?.slice(0, 10) || null, tipo: 'risco' as const }))
          .slice(0, 10)

        const perdidos: PacienteRisco[] = (pacInativos || [])
          .map((p: any) => ({ id: p.id, nome: p.nome, whatsapp: p.whatsapp, ultimo_atendimento: p.updated_at?.slice(0, 10) || null, tipo: 'perdido' as const }))
          .slice(0, 5)

        setPacientesRisco([...risco, ...perdidos])
      } catch (retencaoErr) {
        console.warn('[financeiro] Radar de retenção ignorado por erro:', retencaoErr)
        setPacientesRisco([])
      }

      // 9. Stats por convênio
      const { data: convList } = await supabase
        .from('convenios')
        .select('id, nome, cor')
        .eq('clinica_id', clinicaId)
        .eq('ativo', true)

      const receitaTotal = rec || 1
      const stats: ConvenioStat[] = await Promise.all(
        (convList || []).map(async (c: any) => {
          const { count: pacCount } = await supabase
            .from('pacientes')
            .select('*', { count: 'exact', head: true })
            .eq('clinica_id', clinicaId)
            .eq('convenio_id', c.id)
            .eq('status', 'Ativo')

          const { count: sessCount } = await supabase
            .from('agendamentos')
            .select('*', { count: 'exact', head: true })
            .eq('clinica_id', clinicaId)
            .eq('status', 'REALIZADO')
            .gte('data', inicioMes)
            .lte('data', hoje)

          const { data: lancConv } = await supabase
            .from('lancamentos_financeiros')
            .select('valor')
            .eq('clinica_id', clinicaId)
            .eq('tipo', 'RECEITA')
            .eq('convenio_id', c.id)
            .eq('status', 'CONFIRMADO')
            .gte('data_lancamento', inicioMes)

          const recConv = (lancConv || []).reduce((s: number, l: any) => s + l.valor, 0)
          return {
            id: c.id,
            nome: c.nome,
            cor: c.cor,
            pacientes_ativos: pacCount || 0,
            sessoes_mes: sessCount || 0,
            receita_total: recConv,
            percentual: Math.round((recConv / receitaTotal) * 100),
          }
        })
      )
      setConvenioStats(stats.sort((a, b) => b.receita_total - a.receita_total))

    } catch (e) {
      console.error('[financeiro] loadData error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
          </div>
          <p className="text-sm text-slate-500 font-medium">Carregando dashboard financeiro...</p>
        </div>
      </div>
    )
  }

  if (!temAcesso) return <UpgradeScreen />

  const ricoCount = pacientesRisco.filter(p => p.tipo === 'risco').length
  const perdidosCount = pacientesRisco.filter(p => p.tipo === 'perdido').length
  const totalRisco = ricoCount + perdidosCount

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-400/30">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Dashboard Financeiro</h1>
              <p className="text-xs text-slate-500">Mês atual • Dados em tempo real</p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-semibold shadow-lg shadow-purple-400/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Novo Lançamento
          </button>
        </div>

        {/* ── SEÇÃO 1: KPI CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Receita */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-emerald-100 shadow-sm" style={{ boxShadow: '0 0 0 1px rgba(34,197,94,0.1), 0 4px 16px rgba(34,197,94,0.08)' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${variacaoReceita >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {variacaoReceita >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(variacaoReceita).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receita do Mês</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{fmtBRL(receitaMes)}</p>
            <p className="text-xs text-slate-400 mt-1">vs {fmtBRL(receitaMesAnterior)} mês anterior</p>
          </div>

          {/* Despesas */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-rose-100 shadow-sm" style={{ boxShadow: '0 0 0 1px rgba(239,68,68,0.1), 0 4px 16px rgba(239,68,68,0.06)' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-rose-600" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Despesas do Mês</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{fmtBRL(despesaMes)}</p>
            <p className="text-xs text-slate-400 mt-1">{despesaMes > 0 && receitaMes > 0 ? `${((despesaMes/receitaMes)*100).toFixed(0)}% da receita` : '—'}</p>
          </div>

          {/* Saldo */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-purple-100 shadow-sm" style={{ boxShadow: '0 0 0 1px rgba(168,85,247,0.12), 0 4px 16px rgba(168,85,247,0.08)' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo Líquido</p>
            <p className={`text-2xl font-bold mt-1 ${saldoLiquido >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{fmtBRL(saldoLiquido)}</p>
            <p className="text-xs text-slate-400 mt-1">Receita − Despesas</p>
          </div>

          {/* Ticket Médio */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-blue-100 shadow-sm" style={{ boxShadow: '0 0 0 1px rgba(59,130,246,0.1), 0 4px 16px rgba(59,130,246,0.06)' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket Médio</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{fmtBRL(ticketMedio)}</p>
            <p className="text-xs text-slate-400 mt-1">{sessoesMes} sessões realizadas</p>
          </div>
        </div>

        {/* ── SEÇÃO 2: GRÁFICO EVOLUÇÃO 6M ── */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Evolução Financeira</h2>
          <p className="text-xs text-slate-400 mb-5">Últimos 6 meses</p>
          {evolucao6m.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Nenhum dado disponível ainda</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={evolucao6m} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  formatter={(value: number | undefined) => [value ? fmtBRL(value) : 'R$ 0,00', '']}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="receita" name="Receita" fill="#22c55e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="despesa" name="Despesa" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── SEÇÃO 3: FLUXO DE CAIXA ── */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Fluxo de Caixa</h2>
          <p className="text-xs text-slate-400 mb-5">Saldo acumulado — mês atual</p>
          {fluxoDiario.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Nenhum lançamento este mês</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={fluxoDiario}>
                <defs>
                  <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(1)}k`} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v: number | undefined) => [v ? fmtBRL(v) : 'R$ 0,00', 'Saldo']} />
                <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1.5} />
                <Area type="monotone" dataKey="saldo" stroke="#a855f7" strokeWidth={2} fill="url(#gradSaldo)" dot={(props: any) => props.payload.negativo ? <circle cx={props.cx} cy={props.cy} r={4} fill="#f43f5e" key={props.key} /> : <circle cx={props.cx} cy={props.cy} r={3} fill="#a855f7" key={props.key} />} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── SEÇÃO 4: RADAR DE RETENÇÃO ── */}
        <div className={`rounded-2xl p-6 border-2 shadow-sm ${totalRisco > 0 ? 'bg-amber-50/80 border-amber-300' : 'bg-emerald-50/80 border-emerald-300'}`}
          style={totalRisco > 0 ? { animation: 'pulse 3s ease-in-out infinite', boxShadow: '0 0 0 4px rgba(251,191,36,0.15)' } : {}}>
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${totalRisco > 0 ? 'bg-amber-100' : 'bg-emerald-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${totalRisco > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-slate-900">⚠️ Radar de Retenção de Pacientes</h2>
              <p className="text-xs text-slate-500">Pacientes em risco de abandono</p>
            </div>
            {totalRisco > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold shadow">
                {totalRisco} em risco
              </span>
            )}
          </div>

          {totalRisco === 0 ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-lg">✅</div>
              <p className="text-sm font-semibold text-emerald-700">Todos os pacientes estão ativos e atendidos!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {/* Em risco */}
              <div>
                <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  Em risco (+30 dias sem atendimento) — {ricoCount}
                </h3>
                <div className="space-y-2">
                  {pacientesRisco.filter(p => p.tipo === 'risco').map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-white/80 rounded-xl px-3 py-2.5 border border-amber-200">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{p.nome}</p>
                        <p className="text-[10px] text-slate-500">Último: {p.ultimo_atendimento ? p.ultimo_atendimento.split('-').reverse().join('/') : '—'}</p>
                      </div>
                      {p.whatsapp && (
                        <a
                          href={`https://wa.me/55${p.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Oi ${p.nome}! 👋 Sentimos sua falta na clínica! Que tal agendar uma sessão? Estamos aqui para te ajudar 💜`)}`}
                          target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20BA5A] text-white text-[10px] font-bold transition-all"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                          WhatsApp
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Perdidos */}
              <div>
                <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  Perdidos neste mês — {perdidosCount}
                </h3>
                <div className="space-y-2">
                  {pacientesRisco.filter(p => p.tipo === 'perdido').map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-white/80 rounded-xl px-3 py-2.5 border border-rose-200">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{p.nome}</p>
                        <p className="text-[10px] text-slate-500">Inativado: {p.ultimo_atendimento ? p.ultimo_atendimento.split('-').reverse().join('/') : '—'}</p>
                      </div>
                      {p.whatsapp && (
                        <a
                          href={`https://wa.me/55${p.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Oi ${p.nome}! 👋 Sentimos sua falta na clínica! Que tal agendar uma sessão? Estamos aqui para te ajudar 💜`)}`}
                          target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20BA5A] text-white text-[10px] font-bold transition-all"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                          WhatsApp
                        </a>
                      )}
                    </div>
                  ))}
                  {perdidosCount === 0 && <p className="text-xs text-slate-400 italic">Nenhum paciente perdido este mês 🎉</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── SEÇÃO 5: RELATÓRIO POR CONVÊNIO ── */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-5">Receita por Convênio — mês atual</h2>
          {convenioStats.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nenhum dado disponível</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="text-left pb-3">Convênio</th>
                    <th className="text-right pb-3">Pacientes</th>
                    <th className="text-right pb-3">Sessões</th>
                    <th className="text-right pb-3">Receita</th>
                    <th className="text-left pb-3 pl-4">Participação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {convenioStats.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 font-semibold text-slate-800 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.cor }} />
                        {c.nome}
                      </td>
                      <td className="py-3 text-right text-slate-600">{c.pacientes_ativos}</td>
                      <td className="py-3 text-right text-slate-600">{c.sessoes_mes}</td>
                      <td className="py-3 text-right font-semibold text-emerald-700">{fmtBRL(c.receita_total)}</td>
                      <td className="py-3 pl-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${c.percentual}%`, backgroundColor: c.cor }} />
                          </div>
                          <span className="text-xs text-slate-500 w-8 text-right">{c.percentual}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── SEÇÃO 6: CALENDÁRIO FISCAL ── */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="w-5 h-5 text-purple-600" />
            <h2 className="text-sm font-bold text-slate-900">📅 Calendário Fiscal</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {taxEvents.map((ev, i) => {
              const dias = daysDiff(ev.data)
              const badge = dias <= 5
                ? { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', label: `${dias}d` }
                : dias <= 15
                  ? { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: `${dias}d` }
                  : { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: `${dias}d` }
              return (
                <div key={i} className={`rounded-xl p-4 border ${badge.bg} ${badge.border}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{ev.nome}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{ev.data.toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.bg} ${badge.text} border ${badge.border}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── SEÇÃO 7: LANÇAMENTOS RECENTES ── */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-slate-900">Lançamentos Recentes</h2>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo lançamento
            </button>
          </div>
          {lancamentos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400">Nenhum lançamento este mês</p>
              <button onClick={() => setModalOpen(true)} className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 text-purple-600 text-xs font-semibold hover:bg-purple-100 transition-all">
                <Plus className="w-3.5 h-3.5" /> Adicionar primeiro lançamento
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {lancamentos.map(l => (
                <div key={l.id} className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-slate-50/80 transition-colors border border-transparent hover:border-slate-100">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${l.tipo === 'RECEITA' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                    {l.tipo === 'RECEITA' ? <ArrowUpRight className="w-4 h-4 text-emerald-600" /> : <ArrowDownRight className="w-4 h-4 text-rose-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{l.descricao || l.categoria}</p>
                    <p className="text-[10px] text-slate-400">{l.data_lancamento.split('-').reverse().join('/')} · {l.categoria}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${l.tipo === 'RECEITA' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {l.tipo === 'RECEITA' ? '+' : '−'}{fmtBRL(l.valor)}
                    </p>
                    <span className={`inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      l.status === 'CONFIRMADO' ? 'bg-emerald-50 text-emerald-600' :
                      l.status === 'PENDENTE' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {l.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* MODAL NOVO LANÇAMENTO */}
      {modalOpen && clinicaIdRef.current && (
        <ModalLancamento
          clinicaId={clinicaIdRef.current}
          onClose={() => setModalOpen(false)}
          onSaved={loadData}
        />
      )}
    </div>
  )
}
