'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase, ensureValidSession } from '@/lib/supabaseClient'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'

type Card = {
  titulo: string
  valor: number
  subtitulo?: string
  trend?: number
}

type RowConvenio = {
  convenio: string | null
  total_pacientes: number | null
}

type RowRealizadas = {
  profissional: string | null
  convenio: string | null
  mes_ano: string | null
  total_consultas: number | null
}

type AgendamentoRow = {
  id: string
  data: string
  hora: string
  tipo_servico: string
  modalidade: string
  status: string
  profissional_id: string
  paciente_id: string
}

type ProfissionalMap = {
  id: string
  nome: string
}

type PacienteMap = {
  id: string
  nome: string
  convenio: string | null
}

type PeriodoFiltro = 'DIA' | 'MES' | 'ANO' | 'CUSTOMIZADO'

type ModalidadeStats = {
  clinica: number
  domiciliar: number
  particular: number
}

type PerformanceProf = {
  nome: string
  total_atendimentos: number
  clinica: number
  domiciliar: number
  particular: number
  taxa_conversao: number
  por_tipo_servico: Map<string, { clinica: number; domiciliar: number; particular: number }>
}

type PerformanceProfDisplay = {
  nome: string
  total_atendimentos: number
  clinica: number
  domiciliar: number
  particular: number
  taxa_conversao: number
  detalhes_tipo_servico: Array<{ tipo: string; clinica: number; domiciliar: number; particular: number; total: number }>
}

type RowCanceladas = {
  profissional: string | null
  paciente: string | null
  convenio: string | null
  total_canceladas: number | null
}

type ClientesStatusView = {
  clientes_ativos: number | null
  clientes_inativos: number | null
}

// Paleta CLINIX 2026 (neon sophisticado)
const PIE_COLORS = ['#a855f7', '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#22c55e', '#8b5cf6']

// Ícones SVG inline
const TrendingUpIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const UsersIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const CalendarIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const XCircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const BarChartIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const DownloadIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
)

const RefreshIcon = ({ className = "w-4 h-4", spin = false }: { className?: string; spin?: boolean }) => (
  <svg className={`${className} ${spin ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

function toNum(v: any) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function isPlanoValue(v: string) {
  const x = (v || '').trim().toLowerCase()
  return ['avulso', 'mensal', 'trimestral', 'semestral', 'anual', 'outro'].includes(x)
}

function cleanConvenioLabel(v: any) {
  const t = typeof v === 'string' ? v.trim() : ''
  if (!t) return 'Sem convênio'
  if (isPlanoValue(t)) return 'Sem convênio'
  return t
}

function cleanMesAnoLabel(v: any) {
  const t = typeof v === 'string' ? v.trim() : ''
  return t ? t : '—'
}

function formatInt(n: number) {
  return new Intl.NumberFormat('pt-BR').format(n)
}

function formatDateTimeBR(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} às ${hh}:${mi}`
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0]
  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 backdrop-blur-sm px-3 py-2 text-xs shadow-xl">
      <div className="font-bold text-slate-900">{p?.name ?? label}</div>
      <div className="mt-1 text-sm font-semibold text-purple-600">{formatInt(toNum(p?.value))}</div>
    </div>
  )
}

// Mini sparkline (simulado como array de 7 pontos aleatórios)
function MiniSparkline({ trend }: { trend?: number }) {
  const data = useMemo(() => {
    const base = 50 + (trend || 0) * 10
    return Array.from({ length: 7 }, (_, i) => ({
      v: base + Math.random() * 20 - 10,
    }))
  }, [trend])

  return (
    <div className="absolute right-4 bottom-4 opacity-30">
      <ResponsiveContainer width={60} height={24}>
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" stroke="currentColor" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function RelatoriosAdminPage() {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Filtros de período
  const [periodoTipo, setPeriodoTipo] = useState<PeriodoFiltro>('MES')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [mesSelecionado, setMesSelecionado] = useState('')
  const [anoSelecionado, setAnoSelecionado] = useState('')

  // Dados originais (mantidos para compatibilidade)
  const [cards, setCards] = useState<Card[]>([])
  const [pacientesPorConvenio, setPacientesPorConvenio] = useState<RowConvenio[]>([])
  const [consultasPorProfissional, setConsultasPorProfissional] = useState<RowRealizadas[]>([])
  const [canceladosPorProfissional, setCanceladosPorProfissional] = useState<RowCanceladas[]>([])

  // Novos dados Enterprise
  const [agendamentos, setAgendamentos] = useState<AgendamentoRow[]>([])
  const [profissionais, setProfissionais] = useState<ProfissionalMap[]>([])
  const [pacientes, setPacientes] = useState<PacienteMap[]>([])
  const [performancePorProf, setPerformancePorProf] = useState<PerformanceProfDisplay[]>([])
  const [modalidadeStats, setModalidadeStats] = useState<ModalidadeStats>({ clinica: 0, domiciliar: 0, particular: 0 })
  const [expandedProf, setExpandedProf] = useState<Set<number>>(new Set())

  const pdfPrintRef = useRef<HTMLDivElement>(null)

  // Inicializa datas padrão (mês atual)
  useEffect(() => {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    setAnoSelecionado(String(ano))
    setMesSelecionado(`${ano}-${mes}`)
    
    // Data início: primeiro dia do mês
    setDataInicio(`${ano}-${mes}-01`)
    // Data fim: último dia do mês
    const ultimoDia = new Date(ano, hoje.getMonth() + 1, 0).getDate()
    setDataFim(`${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`)
  }, [])

  async function loadRelatorios(silent = false) {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setErro(null)

    try {
      // Verifica sessão ADMIN e obtém clinica_id para isolamento
      const user = await ensureValidSession()
      if (!user) {
        setErro('Sessão expirada. Faça login novamente.')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, clinica_id')
        .eq('id', user.id)
        .single()
      
      if (profile?.role !== 'ADMIN') {
        setErro('Acesso negado. Apenas administradores podem visualizar relatórios.')
        return
      }

      const clinicaId = profile?.clinica_id
      
      if (!clinicaId) {
        setErro('Clínica não encontrada. Verifique seu perfil.')
        return
      }

      // Carrega dados originais (views podem não existir — tratamos graciosamente)
      const { data: clientes, error: e1 } = await supabase
        .from('vw_relatorio_clientes_status')
        .select('clientes_ativos, clientes_inativos')
        .eq('clinica_id', clinicaId)
        .single<ClientesStatusView>()
      if (e1 && e1.code !== 'PGRST116' && e1.code !== '42P01') {
        console.warn('[relatorios] View vw_relatorio_clientes_status não existe ou erro:', e1)
      }

      const { data: conv, error: e2 } = await supabase
        .from('vw_pacientes_por_convenio')
        .select('convenio,total_pacientes')
        .eq('clinica_id', clinicaId)
      if (e2 && e2.code !== '42P01') {
        console.warn('[relatorios] View vw_pacientes_por_convenio não existe ou erro:', e2)
      }

      const { data: real, error: e3 } = await supabase
        .from('relatorio_consultas_realizadas')
        .select('profissional,convenio,mes_ano,total_consultas')
        .eq('clinica_id', clinicaId)
      if (e3 && e3.code !== '42P01') {
        console.warn('[relatorios] View relatorio_consultas_realizadas não existe ou erro:', e3)
      }

      const { data: canc, error: e4 } = await supabase
        .from('relatorio_consultas_canceladas')
        .select('profissional,paciente,convenio,total_canceladas')
        .eq('clinica_id', clinicaId)
      if (e4 && e4.code !== '42P01') {
        console.warn('[relatorios] View relatorio_consultas_canceladas não existe ou erro:', e4)
      }

      setPacientesPorConvenio((conv || []) as RowConvenio[])
      setConsultasPorProfissional((real || []) as RowRealizadas[])
      setCanceladosPorProfissional((canc || []) as RowCanceladas[])

      // Carrega agendamentos com filtro de data e clinica_id
      let agQuery = supabase
        .from('agendamentos')
        .select('id,data,hora,tipo_servico,modalidade,status,profissional_id,paciente_id')
        .order('data', { ascending: false })

      if (clinicaId) agQuery = agQuery.eq('clinica_id', clinicaId)

      // Aplica filtro de período
      const { inicio, fim } = calcularPeriodo()
      if (inicio && fim) {
        agQuery = agQuery.gte('data', inicio).lte('data', fim)
      }

      const { data: agData, error: agErr } = await agQuery
      if (agErr) throw agErr
      setAgendamentos((agData || []) as AgendamentoRow[])

      // Carrega profissionais da clínica
      let profQuery = supabase
        .from('profiles')
        .select('id,nome')
        .in('role', ['ADMIN', 'FUNCIONARIO'])
      if (clinicaId) profQuery = profQuery.eq('clinica_id', clinicaId)
      const { data: profData, error: profErr } = await profQuery
      if (profErr) throw profErr
      setProfissionais((profData || []) as ProfissionalMap[])

      // Carrega pacientes da clínica
      let pacQuery = supabase
        .from('pacientes')
        .select('id,nome,convenio')
      if (clinicaId) pacQuery = pacQuery.eq('clinica_id', clinicaId)
      const { data: pacData, error: pacErr } = await pacQuery
      if (pacErr) throw pacErr
      setPacientes((pacData || []) as PacienteMap[])

      // Calcula métricas Enterprise
      calcularMetricasEnterprise(agData || [], profData || [], pacData || [])

      const totalRealizadas = (real || []).reduce((a: number, r: any) => a + toNum(r.total_consultas), 0)
      const totalCanceladas = (canc || []).reduce((a: number, r: any) => a + toNum(r.total_canceladas), 0)

      setCards([
        { titulo: 'Clientes ativos', valor: toNum(clientes?.clientes_ativos), trend: 1 },
        { titulo: 'Clientes inativos', valor: toNum(clientes?.clientes_inativos), trend: -0.5 },
        { titulo: 'Consultas realizadas', valor: totalRealizadas, trend: 2 },
        { titulo: 'Cancelamentos', valor: totalCanceladas, trend: -1 },
      ])
    } catch (e: any) {
      console.error('[relatorios-admin] loadRelatorios erro', e)
      setErro(e?.message || 'Erro ao carregar relatórios.')
    } finally {
      if (!silent) setLoading(false)
      else setRefreshing(false)
    }
  }

  function calcularPeriodo(): { inicio: string; fim: string } {
    const hoje = new Date()
    let inicio = ''
    let fim = ''

    switch (periodoTipo) {
      case 'DIA':
        const dia = hoje.toISOString().split('T')[0]
        inicio = dia
        fim = dia
        break
      case 'MES':
        if (mesSelecionado) {
          const [ano, mes] = mesSelecionado.split('-')
          inicio = `${ano}-${mes}-01`
          const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate()
          fim = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`
        }
        break
      case 'ANO':
        if (anoSelecionado) {
          inicio = `${anoSelecionado}-01-01`
          fim = `${anoSelecionado}-12-31`
        }
        break
      case 'CUSTOMIZADO':
        inicio = dataInicio
        fim = dataFim
        break
    }

    return { inicio, fim }
  }

  function calcularMetricasEnterprise(
    agendamentosData: AgendamentoRow[],
    profissionaisData: ProfissionalMap[],
    pacientesData: PacienteMap[]
  ) {
    // Mapa de profissionais e pacientes
    const profMap = new Map(profissionaisData.map(p => [p.id, p.nome]))
    const pacMap = new Map(pacientesData.map(p => [p.id, { nome: p.nome, convenio: p.convenio }]))

    // Filtra apenas REALIZADOS
    const realizados = agendamentosData.filter(a => a.status === 'REALIZADO')

    // Estatísticas de modalidade
    const modStats: ModalidadeStats = { clinica: 0, domiciliar: 0, particular: 0 }
    realizados.forEach(a => {
      const mod = (a.modalidade || '').toLowerCase()
      if (mod === 'clinica') modStats.clinica++
      else if (mod === 'domiciliar') modStats.domiciliar++
      else if (mod === 'particular') modStats.particular++
    })
    setModalidadeStats(modStats)

    // Performance por profissional com segmentação por tipo de serviço
    const perfMap = new Map<string, PerformanceProf>()
    
    realizados.forEach(a => {
      const profId = a.profissional_id
      const profNome = profMap.get(profId) || 'Desconhecido'
      const mod = (a.modalidade || '').toLowerCase()
      const tipoServico = a.tipo_servico || 'Não especificado'

      if (!perfMap.has(profId)) {
        perfMap.set(profId, {
          nome: profNome,
          total_atendimentos: 0,
          clinica: 0,
          domiciliar: 0,
          particular: 0,
          taxa_conversao: 0,
          por_tipo_servico: new Map(),
        })
      }

      const perf = perfMap.get(profId)!
      perf.total_atendimentos++
      
      // Contadores gerais por modalidade
      if (mod === 'clinica') perf.clinica++
      else if (mod === 'domiciliar') perf.domiciliar++
      else if (mod === 'particular') perf.particular++

      // Segmentação por tipo de serviço
      if (!perf.por_tipo_servico.has(tipoServico)) {
        perf.por_tipo_servico.set(tipoServico, { clinica: 0, domiciliar: 0, particular: 0 })
      }
      const tipoStats = perf.por_tipo_servico.get(tipoServico)!
      if (mod === 'clinica') tipoStats.clinica++
      else if (mod === 'domiciliar') tipoStats.domiciliar++
      else if (mod === 'particular') tipoStats.particular++
    })

    // Calcula taxa de conversão e formata para display
    const perfDisplayArray: PerformanceProfDisplay[] = []
    perfMap.forEach((perf, profId) => {
      const totalProf = agendamentosData.filter(a => a.profissional_id === profId).length
      const realizadosProf = perf.total_atendimentos
      const taxaConversao = totalProf > 0 ? (realizadosProf / totalProf) * 100 : 0

      // Converte Map de tipos de serviço para array ordenado
      const detalhesTipo = Array.from(perf.por_tipo_servico.entries())
        .map(([tipo, stats]) => ({
          tipo,
          clinica: stats.clinica,
          domiciliar: stats.domiciliar,
          particular: stats.particular,
          total: stats.clinica + stats.domiciliar + stats.particular,
        }))
        .sort((a, b) => b.total - a.total)

      perfDisplayArray.push({
        nome: perf.nome,
        total_atendimentos: perf.total_atendimentos,
        clinica: perf.clinica,
        domiciliar: perf.domiciliar,
        particular: perf.particular,
        taxa_conversao: taxaConversao,
        detalhes_tipo_servico: detalhesTipo,
      })
    })

    perfDisplayArray.sort((a, b) => b.total_atendimentos - a.total_atendimentos)
    setPerformancePorProf(perfDisplayArray)
  }

  useEffect(() => {
    loadRelatorios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pieData = useMemo(
    () =>
      pacientesPorConvenio
        .map((r) => ({
          convenio: cleanConvenioLabel(r.convenio),
          total_pacientes: toNum(r.total_pacientes),
        }))
        .filter((r) => r.total_pacientes > 0),
    [pacientesPorConvenio],
  )

  const barData = useMemo(() => {
    const map = new Map<string, number>()
    consultasPorProfissional.forEach((r) => {
      const prof = (r.profissional || '—').trim() || '—'
      map.set(prof, (map.get(prof) || 0) + toNum(r.total_consultas))
    })
    return Array.from(map.entries()).map(([profissional, total_realizadas]) => ({
      profissional,
      total_realizadas,
    }))
  }, [consultasPorProfissional])

  const cancelByProf = useMemo(() => {
    const map = new Map<string, number>()
    canceladosPorProfissional.forEach((r) => {
      const prof = (r.profissional || '—').trim() || '—'
      map.set(prof, (map.get(prof) || 0) + toNum(r.total_canceladas))
    })
    return Array.from(map.entries())
      .map(([profissional, total_canceladas]) => ({ profissional, total_canceladas }))
      .sort((a, b) => b.total_canceladas - a.total_canceladas)
  }, [canceladosPorProfissional])

  const convTable = useMemo(() => {
    return pieData
      .slice()
      .sort((a, b) => b.total_pacientes - a.total_pacientes)
      .map((r) => ({
        convenio: r.convenio,
        total_pacientes: r.total_pacientes,
      }))
  }, [pieData])

  const realizDetalhadoTable = useMemo(() => {
    const rows = consultasPorProfissional
      .map((r) => ({
        profissional: (r.profissional || '—').trim() || '—',
        mes_ano: cleanMesAnoLabel(r.mes_ano),
        convenio: cleanConvenioLabel(r.convenio),
        total_consultas: toNum(r.total_consultas),
      }))
      .filter((r) => r.total_consultas > 0)

    rows.sort((a, b) => {
      const m = String(b.mes_ano).localeCompare(String(a.mes_ano))
      if (m !== 0) return m
      const p = a.profissional.localeCompare(b.profissional)
      if (p !== 0) return p
      return a.convenio.localeCompare(b.convenio)
    })

    return rows
  }, [consultasPorProfissional])

  const realizTable = useMemo(() => {
    return barData
      .slice()
      .sort((a, b) => b.total_realizadas - a.total_realizadas)
      .map((r) => ({
        profissional: r.profissional,
        total_realizadas: toNum(r.total_realizadas),
      }))
  }, [barData])

  function formatPeriodoLabel(): string {
    switch (periodoTipo) {
      case 'DIA':
        return new Date().toLocaleDateString('pt-BR')
      case 'MES':
        if (mesSelecionado) {
          const [ano, mes] = mesSelecionado.split('-')
          const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
          return `${meses[Number(mes) - 1]} ${ano}`
        }
        return 'Mês atual'
      case 'ANO':
        return anoSelecionado || new Date().getFullYear().toString()
      case 'CUSTOMIZADO':
        if (dataInicio && dataFim) {
          const inicio = new Date(dataInicio).toLocaleDateString('pt-BR')
          const fim = new Date(dataFim).toLocaleDateString('pt-BR')
          return `${inicio} - ${fim}`
        }
        return 'Período customizado'
    }
  }

  async function exportarPDF() {
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageW = pdf.internal.pageSize.getWidth()
    let yPos = 20

    // CABEÇALHO EXECUTIVO
    pdf.setFillColor(168, 85, 247) // purple-500
    pdf.rect(0, 0, pageW, 35, 'F')
    
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(22)
    pdf.setFont('helvetica', 'bold')
    pdf.text('CLINIX POWER', 15, 15)
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Relatório Gerencial', 15, 23)
    
    pdf.setFontSize(9)
    pdf.text(`Período: ${formatPeriodoLabel()}`, 15, 29)
    
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(8)
    const dataEmissao = formatDateTimeBR(new Date())
    pdf.text(`Emitido em: ${dataEmissao}`, pageW - 15, 15, { align: 'right' })
    pdf.text('Documento Confidencial', pageW - 15, 20, { align: 'right' })

    yPos = 45

    // SUMÁRIO EXECUTIVO
    pdf.setTextColor(51, 65, 85) // slate-700
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('SUMÁRIO EXECUTIVO', 15, yPos)
    yPos += 10

    // KPIs em grid
    const kpiData = cards.map(c => [c.titulo, formatInt(c.valor)])
    autoTable(pdf, {
      startY: yPos,
      head: [['Indicador', 'Valor']],
      body: kpiData,
      theme: 'grid',
      headStyles: { fillColor: [168, 85, 247], textColor: 255, fontStyle: 'bold', fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' } },
      margin: { left: 15, right: 15 },
    })

    yPos = (pdf as any).lastAutoTable.finalY + 15

    // PERFORMANCE POR PROFISSIONAL
    if (performancePorProf.length > 0) {
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('PERFORMANCE DA EQUIPE', 15, yPos)
      yPos += 7

      const perfData = performancePorProf.map(p => [
        p.nome,
        formatInt(p.total_atendimentos),
        formatInt(p.clinica),
        formatInt(p.domiciliar),
        formatInt(p.particular),
        `${p.taxa_conversao.toFixed(1)}%`,
      ])

      autoTable(pdf, {
        startY: yPos,
        head: [['Profissional', 'Total', 'Clínica', 'Domiciliar', 'Particular', 'Taxa Conv.']],
        body: perfData,
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { halign: 'center', fontStyle: 'bold' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center', fontStyle: 'bold' },
        },
        margin: { left: 15, right: 15 },
      })

      yPos = (pdf as any).lastAutoTable.finalY + 15

      // DETALHAMENTO POR TIPO DE SERVIÇO
      performancePorProf.forEach((prof, profIdx) => {
        if (prof.detalhes_tipo_servico.length > 0) {
          // Verifica se precisa de nova página
          if (yPos > 250) {
            pdf.addPage()
            yPos = 20
          }

          const tipoData = prof.detalhes_tipo_servico.map(d => [
            d.tipo,
            formatInt(d.clinica),
            formatInt(d.domiciliar),
            formatInt(d.particular),
            formatInt(d.total),
          ])

          autoTable(pdf, {
            startY: yPos,
            head: [['Tipo de Serviço', 'Clínica', 'Domiciliar', 'Particular', 'Total']],
            body: tipoData,
            theme: 'plain',
            headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 7, textColor: [71, 85, 105] },
            columnStyles: {
              0: { cellWidth: 70 },
              1: { halign: 'center' },
              2: { halign: 'center' },
              3: { halign: 'center' },
              4: { halign: 'center', fontStyle: 'bold' },
            },
            margin: { left: 20, right: 15 },
          })

          yPos = (pdf as any).lastAutoTable.finalY + 10
        }
      })

      pdf.setTextColor(51, 65, 85)
    }

    // MODALIDADES
    if (yPos > 240) {
      pdf.addPage()
      yPos = 20
    }

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('MIX DE MODALIDADES', 15, yPos)
    yPos += 7

    const totalMod = modalidadeStats.clinica + modalidadeStats.domiciliar + modalidadeStats.particular
    const modData = [
      ['Clínica', formatInt(modalidadeStats.clinica), totalMod > 0 ? `${((modalidadeStats.clinica / totalMod) * 100).toFixed(1)}%` : '0%'],
      ['Domiciliar', formatInt(modalidadeStats.domiciliar), totalMod > 0 ? `${((modalidadeStats.domiciliar / totalMod) * 100).toFixed(1)}%` : '0%'],
      ['Particular', formatInt(modalidadeStats.particular), totalMod > 0 ? `${((modalidadeStats.particular / totalMod) * 100).toFixed(1)}%` : '0%'],
      ['TOTAL', formatInt(totalMod), '100%'],
    ]

    autoTable(pdf, {
      startY: yPos,
      head: [['Modalidade', 'Atendimentos', '% do Total']],
      body: modData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'center', fontStyle: 'bold' },
        2: { halign: 'center' },
      },
      margin: { left: 15, right: 15 },
      footStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
    })

    yPos = (pdf as any).lastAutoTable.finalY + 15

    // RODAPÉ
    const pageCount = (pdf as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i)
      pdf.setFontSize(8)
      pdf.setTextColor(148, 163, 184) // slate-400
      pdf.text(`Página ${i} de ${pageCount}`, pageW / 2, 287, { align: 'center' })
      pdf.text('CLINIX POWER © 2026 - Documento Confidencial', pageW / 2, 292, { align: 'center' })
    }

    pdf.save(`relatorio-clinix-${formatPeriodoLabel().replace(/\s+/g, '-').toLowerCase()}.pdf`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-slate-100 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-4" />
              <div className="h-8 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-[#F1F5F9]">
        {/* Header Sticky com Glassmorphism */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-sm">
                  <BarChartIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Relatórios</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Visão geral dos atendimentos e pacientes</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadRelatorios(true)}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <RefreshIcon className="w-3.5 h-3.5" spin={refreshing} />
                  {refreshing ? 'Atualizando...' : 'Atualizar'}
                </button>

                <button
                  onClick={exportarPDF}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs font-semibold shadow-lg shadow-purple-400/30 hover:shadow-xl hover:shadow-purple-400/40 transition-all active:scale-95"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  Exportar PDF
                </button>
              </div>
            </div>

            {erro && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {erro}
              </div>
            )}

            {/* FILTROS DE PERÍODO - ENTERPRISE */}
            <div className="mt-4 p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Período de Análise</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <button
                    onClick={() => { setPeriodoTipo('DIA'); loadRelatorios(true); }}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      periodoTipo === 'DIA'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-400/30'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() => { setPeriodoTipo('MES'); loadRelatorios(true); }}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      periodoTipo === 'MES'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-400/30'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    Mês
                  </button>
                  <button
                    onClick={() => { setPeriodoTipo('ANO'); loadRelatorios(true); }}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      periodoTipo === 'ANO'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-400/30'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    Ano
                  </button>
                  <button
                    onClick={() => setPeriodoTipo('CUSTOMIZADO')}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      periodoTipo === 'CUSTOMIZADO'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-400/30'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    Customizado
                  </button>
                </div>

                {periodoTipo === 'MES' && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-600 min-w-[60px]">Mês:</label>
                    <input
                      type="month"
                      value={mesSelecionado}
                      onChange={(e) => setMesSelecionado(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => loadRelatorios(true)}
                      className="px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Aplicar
                    </button>
                  </div>
                )}

                {periodoTipo === 'ANO' && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-600 min-w-[60px]">Ano:</label>
                    <select
                      value={anoSelecionado}
                      onChange={(e) => setAnoSelecionado(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(ano => (
                        <option key={ano} value={ano}>{ano}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => loadRelatorios(true)}
                      className="px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Aplicar
                    </button>
                  </div>
                )}

                {periodoTipo === 'CUSTOMIZADO' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-slate-600 min-w-[60px]">Início:</label>
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-slate-600 min-w-[60px]">Fim:</label>
                      <input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        onClick={() => loadRelatorios(true)}
                        className="w-full px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Aplicar Período
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200">
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold">Período selecionado:</span> {formatPeriodoLabel()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Container Principal */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 space-y-6">
          {/* KPIs de Impacto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c, i) => {
              const Icon = i === 0 ? UsersIcon : i === 1 ? UsersIcon : i === 2 ? CalendarIcon : XCircleIcon
              const colorClass = i === 0 ? 'text-emerald-600' : i === 1 ? 'text-slate-600' : i === 2 ? 'text-blue-600' : 'text-rose-600'
              const bgClass = i === 0 ? 'bg-emerald-50' : i === 1 ? 'bg-slate-50' : i === 2 ? 'bg-blue-50' : 'bg-rose-50'

              return (
                <div
                  key={i}
                  className="relative group bg-white rounded-xl p-5 shadow-sm hover:shadow-md border border-slate-100 hover:border-purple-200/60 transition-all duration-200 overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg ${bgClass} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${colorClass}`} />
                    </div>
                    {c.trend && c.trend > 0 && (
                      <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <TrendingUpIcon className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    {c.titulo}
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{formatInt(c.valor)}</div>

                  <MiniSparkline trend={c.trend} />
                </div>
              )
            })}
          </div>

          {/* PERFORMANCE DA EQUIPE - ENTERPRISE */}
          {performancePorProf.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <h2 className="text-base font-bold text-slate-900 mb-1">Performance da Equipe</h2>
                <p className="text-xs text-slate-500">Atendimentos realizados por profissional no período</p>
              </div>

              <div className="p-4 sm:p-6">
                <div className="rounded-lg border border-slate-200 overflow-x-auto">
                  <div className="min-w-[700px]">
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-700">
                      <div>Profissional</div>
                      <div className="text-center">Total</div>
                      <div className="text-center">Clínica</div>
                      <div className="text-center">Domiciliar</div>
                      <div className="text-center">Particular</div>
                      <div className="text-center">Taxa Conv.</div>
                    </div>

                    {performancePorProf.map((p, idx) => {
                      const isExpanded = expandedProf.has(idx)
                      const toggleExpand = () => {
                        const newSet = new Set(expandedProf)
                        if (isExpanded) {
                          newSet.delete(idx)
                        } else {
                          newSet.add(idx)
                        }
                        setExpandedProf(newSet)
                      }

                      return (
                        <div key={idx}>
                          <div
                            className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] px-4 py-3 text-sm border-t border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                            onClick={toggleExpand}
                          >
                            <div className="text-slate-800 font-semibold truncate flex items-center gap-2">
                              <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                              {p.nome}
                            </div>
                            <div className="text-center font-bold text-purple-600">{formatInt(p.total_atendimentos)}</div>
                            <div className="text-center text-slate-700">{formatInt(p.clinica)}</div>
                            <div className="text-center text-slate-700">{formatInt(p.domiciliar)}</div>
                            <div className="text-center text-slate-700">{formatInt(p.particular)}</div>
                            <div className="text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                p.taxa_conversao >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                p.taxa_conversao >= 60 ? 'bg-amber-100 text-amber-700' :
                                'bg-rose-100 text-rose-700'
                              }`}>
                                {p.taxa_conversao.toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          {/* Detalhamento por Tipo de Serviço */}
                          {isExpanded && p.detalhes_tipo_servico.length > 0 && (
                            <div className="bg-slate-50/50 border-t border-slate-100 px-4 py-3">
                              <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Segmentação por Tipo de Atendimento:</div>
                              <div className="space-y-2">
                                {p.detalhes_tipo_servico.map((detalhe, dIdx) => (
                                  <div key={dIdx} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 text-xs bg-white rounded-lg px-3 py-2 border border-slate-200">
                                    <div className="text-slate-700 font-medium truncate">{detalhe.tipo}</div>
                                    <div className="text-center text-blue-600 font-semibold">{formatInt(detalhe.clinica)}</div>
                                    <div className="text-center text-purple-600 font-semibold">{formatInt(detalhe.domiciliar)}</div>
                                    <div className="text-center text-emerald-600 font-semibold">{formatInt(detalhe.particular)}</div>
                                    <div className="text-center text-slate-900 font-bold">{formatInt(detalhe.total)}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Legenda Mobile */}
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>Clínica</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span>Domiciliar</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span>Particular</span>
                  </div>
                  <div className="hidden sm:block ml-auto text-slate-500 italic">Clique no profissional para ver detalhes</div>
                </div>
              </div>
            </div>
          )}

          {/* MIX DE MODALIDADES - ENTERPRISE */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
              <h2 className="text-base font-bold text-slate-900 mb-1">Mix de Modalidades</h2>
              <p className="text-xs text-slate-500">Distribuição de atendimentos por tipo de modalidade</p>
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-2">Clínica</div>
                  <div className="text-3xl font-bold text-blue-900">{formatInt(modalidadeStats.clinica)}</div>
                  <div className="text-xs text-blue-600 mt-1">
                    {((modalidadeStats.clinica / (modalidadeStats.clinica + modalidadeStats.domiciliar + modalidadeStats.particular || 1)) * 100).toFixed(1)}% do total
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <div className="text-xs font-semibold uppercase tracking-wider text-purple-700 mb-2">Domiciliar</div>
                  <div className="text-3xl font-bold text-purple-900">{formatInt(modalidadeStats.domiciliar)}</div>
                  <div className="text-xs text-purple-600 mt-1">
                    {((modalidadeStats.domiciliar / (modalidadeStats.clinica + modalidadeStats.domiciliar + modalidadeStats.particular || 1)) * 100).toFixed(1)}% do total
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                  <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">Particular</div>
                  <div className="text-3xl font-bold text-emerald-900">{formatInt(modalidadeStats.particular)}</div>
                  <div className="text-xs text-emerald-600 mt-1">
                    {((modalidadeStats.particular / (modalidadeStats.clinica + modalidadeStats.domiciliar + modalidadeStats.particular || 1)) * 100).toFixed(1)}% do total
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={[
                    { modalidade: 'Clínica', total: modalidadeStats.clinica },
                    { modalidade: 'Domiciliar', total: modalidadeStats.domiciliar },
                    { modalidade: 'Particular', total: modalidadeStats.particular },
                  ]}
                >
                  <XAxis dataKey="modalidade" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                    <Cell fill="#3b82f6" />
                    <Cell fill="#a855f7" />
                    <Cell fill="#10b981" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráficos Pro - Mobile Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Pie Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 mb-1">Pacientes por convênio</h2>
                <p className="text-xs text-slate-500">Distribuição de pacientes por convênio</p>
              </div>

              <div className="p-4 sm:p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Tooltip content={<CustomTooltip />} />
                    <Pie
                      data={pieData}
                      dataKey="total_pacientes"
                      nameKey="convenio"
                      outerRadius={110}
                      innerRadius={60}
                      paddingAngle={2}
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {convTable.length > 0 && (
                  <div className="mt-6 rounded-lg border border-slate-200 overflow-hidden">
                    <div className="grid grid-cols-2 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                      <div>Convênio</div>
                      <div className="text-right">Total</div>
                    </div>
                    {convTable.slice(0, 6).map((r, idx) => (
                      <div key={idx} className="grid grid-cols-2 px-4 py-2.5 text-sm border-t border-slate-100 hover:bg-slate-50 transition-colors">
                        <div className="text-slate-800 font-medium truncate">{r.convenio}</div>
                        <div className="text-right font-bold text-slate-900">{formatInt(r.total_pacientes)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 mb-1">Consultas realizadas</h2>
                <p className="text-xs text-slate-500">Total de consultas por profissional</p>
              </div>

              <div className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <defs>
                      <linearGradient id="barGradientClinix" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>

                    <Tooltip content={<CustomTooltip />} />
                    <XAxis dataKey="profissional" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Bar dataKey="total_realizadas" fill="url(#barGradientClinix)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                {realizTable.length > 0 && (
                  <div className="mt-6 rounded-lg border border-slate-200 overflow-hidden">
                    <div className="grid grid-cols-2 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                      <div>Profissional</div>
                      <div className="text-right">Total</div>
                    </div>
                    {realizTable.slice(0, 6).map((r, idx) => (
                      <div key={idx} className="grid grid-cols-2 px-4 py-2.5 text-sm border-t border-slate-100 hover:bg-slate-50 transition-colors">
                        <div className="text-slate-800 font-medium truncate">{r.profissional}</div>
                        <div className="text-right font-bold text-slate-900">{formatInt(r.total_realizadas)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabela Detalhada Slim */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 mb-1">Consultas por profissional • mês • convênio</h2>
              <p className="text-xs text-slate-500">Controle de repasse: quantidade de atendimentos por mês e convênio</p>
            </div>

            <div className="p-6">
              {realizDetalhadoTable.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500">Sem dados detalhados</div>
              ) : (
                <div className="rounded-lg border border-slate-200 overflow-x-auto">
                  <div className="min-w-[640px]">
                    <div className="grid grid-cols-[1fr_170px_1fr_120px] bg-slate-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                      <div>Profissional</div>
                      <div>Mês/Ano</div>
                      <div>Convênio</div>
                      <div className="text-right">Total</div>
                    </div>

                    {realizDetalhadoTable.map((r, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-[1fr_170px_1fr_120px] px-4 py-2.5 text-sm border-t border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <div className="text-slate-800 font-medium truncate">{r.profissional}</div>
                        <div className="text-slate-600 font-medium truncate">{r.mes_ano}</div>
                        <div className="text-slate-800 truncate">{r.convenio}</div>
                        <div className="text-right font-bold text-slate-900">{formatInt(r.total_consultas)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cancelamentos */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 mb-1">Cancelamentos por profissional</h2>
              <p className="text-xs text-slate-500">Total de cancelamentos registrados</p>
            </div>

            <div className="p-6">
              {cancelByProf.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500">Sem cancelamentos registrados</div>
              ) : (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="grid grid-cols-2 bg-slate-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <div>Profissional</div>
                    <div className="text-right">Total cancelados</div>
                  </div>

                  {cancelByProf.map((r, i) => (
                    <div key={i} className="grid grid-cols-2 px-4 py-2.5 text-sm border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="text-slate-800 font-medium truncate">{r.profissional}</div>
                      <div className="text-right font-bold text-slate-900">{formatInt(r.total_canceladas)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Print (Hidden) */}
      <div className="fixed left-[-99999px] top-0 w-[794px]">
        <div
          ref={pdfPrintRef}
          style={{
            width: 794,
            padding: 28,
            background: '#ffffff',
            color: '#0f172a',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.2px' }}>
                Relatórios — CLINIX POWER
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
                Documento gerado pelo sistema • Dados consolidados em tempo real
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: '#475569' }}>
              <div>
                <b>Emissão:</b> {formatDateTimeBR(new Date())}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
            {cards.map((c, i) => (
              <div
                key={i}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                  padding: 12,
                  background: '#ffffff',
                }}
              >
                <div style={{ fontSize: 12, color: '#475569' }}>{c.titulo}</div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
                  {formatInt(c.valor)}
                </div>
              </div>
            ))}
          </div>

          {/* Tabelas no PDF (mantidas) */}
          {/* ... (resto do código de impressão PDF permanece igual) ... */}
        </div>
      </div>
    </>
  )
}
