'use client'

import { useEffect, useState } from 'react'
import { supabase, ensureValidSession } from '@/lib/supabaseClient'
import MasterAdminGate from '@/components/MasterAdminGate'
import { 
  Building2, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  RefreshCw, 
  MessageCircle,
  Eye,
  Power,
  PowerOff,
  Search,
  Filter,
  DollarSign,
  Calendar,
  X,
  ChevronDown,
  FileText,
  CheckCircle2,
  Circle,
  Copy,
  Save,
  StickyNote
} from 'lucide-react'

type Clinica = {
  id: string
  nome_fantasia: string
  cnpj: string | null
  whatsapp: string | null
  email: string
  telefone: string | null
  cidade: string | null
  estado: string | null
  status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'
  data_cadastro: string
  data_ativacao: string | null
  data_expiracao_trial: string | null
  assinatura_ativa: boolean
  assinatura_vencimento: string | null
  plano_nome: string
  plano_valor: number
  total_usuarios: number
  total_pacientes: number
  total_evolucoes: number
  receita_total: number
  pagamento_ativacao_confirmado?: boolean
}

type Metricas = {
  total_clinicas: number
  clinicas_trial: number
  clinicas_ativas: number
  clinicas_suspensas: number
  receita_total: number
}

export default function MasterAdminPage() {
  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [clinicasFiltradas, setClinicasFiltradas] = useState<Clinica[]>([])
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS')
  const [ordenacao, setOrdenacao] = useState<'recente' | 'antigo' | 'nome'>('recente')
  
  // Modal detalhes
  const [clinicaSelecionada, setClinicaSelecionada] = useState<Clinica | null>(null)
  const [showModal, setShowModal] = useState(false)
  
  // WhatsApp dropdown
  const [whatsappDropdownOpen, setWhatsappDropdownOpen] = useState<string | null>(null)
  
  // Anotações privadas
  const [notaClinica, setNotaClinica] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setError(null)

    try {
      const user = await ensureValidSession()
      if (!user) throw new Error('Sessão inválida')

      // Carregar clínicas com detalhes completos
      const { data: clinicasData, error: clinicasError } = await supabase
        .rpc('get_master_admin_clinicas_detalhadas')

      if (clinicasError) {
        // Fallback: buscar direto da tabela se a function não existir
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('clinicas')
          .select(`
            *,
            planos(nome, valor_mensal)
          `)
          .order('data_cadastro', { ascending: false })

        if (fallbackError) throw fallbackError

        const processedData = await Promise.all(
          (fallbackData || []).map(async (c: any) => {
            // Contar usuários
            const { count: usuarios } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .eq('clinica_id', c.id)
              .eq('is_active', true)

            // Contar pacientes
            const { count: pacientes } = await supabase
              .from('pacientes')
              .select('*', { count: 'exact', head: true })
              .eq('clinica_id', c.id)

            // Contar evoluções
            const { count: evolucoes } = await supabase
              .from('evolucoes_clinicas')
              .select('*', { count: 'exact', head: true })
              .eq('clinica_id', c.id)

            // Calcular receita
            const { data: pagamentos } = await supabase
              .from('pagamentos')
              .select('valor')
              .eq('clinica_id', c.id)
              .eq('status', 'APPROVED')

            const receita = pagamentos?.reduce((sum, p) => sum + (p.valor || 0), 0) || 0

            return {
              id: c.id,
              nome_fantasia: c.nome_fantasia,
              cnpj: c.cnpj,
              whatsapp: c.whatsapp,
              email: c.email,
              telefone: c.telefone,
              cidade: c.cidade,
              estado: c.estado,
              status: c.status,
              data_cadastro: c.data_cadastro,
              data_ativacao: c.data_ativacao,
              data_expiracao_trial: c.data_expiracao_trial,
              assinatura_ativa: c.assinatura_ativa,
              assinatura_vencimento: c.assinatura_vencimento,
              plano_nome: c.planos?.nome || 'N/A',
              plano_valor: c.planos?.valor_mensal || 0,
              total_usuarios: usuarios || 0,
              total_pacientes: pacientes || 0,
              total_evolucoes: evolucoes || 0,
              receita_total: receita
            }
          })
        )

        setClinicas(processedData)
      } else {
        setClinicas(clinicasData as Clinica[])
      }

      // Calcular métricas
      const total = clinicasData?.length || 0
      const trial = clinicasData?.filter((c: any) => c.status === 'TRIAL').length || 0
      const ativas = clinicasData?.filter((c: any) => c.status === 'ACTIVE').length || 0
      const suspensas = clinicasData?.filter((c: any) => c.status === 'SUSPENDED').length || 0
      const receita = clinicasData?.reduce((sum: number, c: any) => sum + (c.receita_total || 0), 0) || 0

      setMetricas({
        total_clinicas: total,
        clinicas_trial: trial,
        clinicas_ativas: ativas,
        clinicas_suspensas: suspensas,
        receita_total: receita
      })

    } catch (err: any) {
      console.error('[MasterAdmin] Erro ao carregar dados:', err)
      setError(err.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData(false)
  }, [])

  // Aplicar filtros
  useEffect(() => {
    let resultado = [...clinicas]

    // Filtro de busca
    if (busca.trim()) {
      const termo = busca.toLowerCase()
      resultado = resultado.filter(c => 
        c.nome_fantasia.toLowerCase().includes(termo) ||
        c.email.toLowerCase().includes(termo) ||
        c.cidade?.toLowerCase().includes(termo) ||
        c.estado?.toLowerCase().includes(termo)
      )
    }

    // Filtro de status
    if (filtroStatus !== 'TODOS') {
      resultado = resultado.filter(c => c.status === filtroStatus)
    }

    // Ordenação
    if (ordenacao === 'recente') {
      resultado.sort((a, b) => new Date(b.data_cadastro).getTime() - new Date(a.data_cadastro).getTime())
    } else if (ordenacao === 'antigo') {
      resultado.sort((a, b) => new Date(a.data_cadastro).getTime() - new Date(b.data_cadastro).getTime())
    } else if (ordenacao === 'nome') {
      resultado.sort((a, b) => a.nome_fantasia.localeCompare(b.nome_fantasia))
    }

    setClinicasFiltradas(resultado)
  }, [clinicas, busca, filtroStatus, ordenacao])

  // Alertas automáticos
  const alertas = {
    trialExpirando: clinicas.filter(c => {
      if (c.status !== 'TRIAL' || !c.data_expiracao_trial) return false
      const dias = Math.ceil((new Date(c.data_expiracao_trial).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return dias <= 3 && dias >= 0
    }),
    suspensasAntigo: clinicas.filter(c => {
      if (c.status !== 'SUSPENDED') return false
      const dias = Math.ceil((Date.now() - new Date(c.data_cadastro).getTime()) / (1000 * 60 * 60 * 24))
      return dias > 7
    }),
    nuncaAtivadas: clinicas.filter(c => {
      const dias = Math.ceil((Date.now() - new Date(c.data_cadastro).getTime()) / (1000 * 60 * 60 * 24))
      return dias > 5 && !c.data_ativacao
    })
  }

  async function toggleStatus(clinicaId: string, statusAtual: string) {
    const novoStatus = statusAtual === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED'
    
    try {
      const { error } = await supabase
        .from('clinicas')
        .update({ status: novoStatus })
        .eq('id', clinicaId)

      if (error) throw error

      await loadData(true)
    } catch (err: any) {
      alert('Erro ao alterar status: ' + err.message)
    }
  }

  function formatCurrency(value: number | null) {
    if (!value) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  function formatDate(date: string | null) {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  function formatCNPJ(cnpj: string | null) {
    if (!cnpj) return '-'
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  function formatPhone(phone: string | null) {
    if (!phone) return '-'
    return phone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  }

  // MELHORIA 1: Health Score
  function calcHealthScore(clinica: Clinica): number {
    let score = 0
    if (clinica.total_pacientes > 0) score += 20
    if (clinica.total_pacientes >= 5) score += 10
    if (clinica.total_evolucoes > 0) score += 25
    if (clinica.total_usuarios > 1) score += 15
    if (clinica.data_ativacao) score += 20
    if (clinica.status === 'ACTIVE') score += 10
    return Math.min(score, 100)
  }

  function getHealthBadge(score: number) {
    if (score >= 80) {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-green-100 text-green-700 border-green-300">🟢 Saudável</span>
    } else if (score >= 50) {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-yellow-100 text-yellow-700 border-yellow-300">🟡 Em Risco</span>
    } else {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-red-100 text-red-700 border-red-300">🔴 Crítica</span>
    }
  }

  function getHealthScoreMessage(clinica: Clinica, score: number): string[] {
    const missing: string[] = []
    if (clinica.total_pacientes === 0) missing.push('Cadastre o primeiro paciente (+20 pontos)')
    else if (clinica.total_pacientes < 5) missing.push(`Cadastre mais ${5 - clinica.total_pacientes} paciente(s) para +10 pontos`)
    if (clinica.total_evolucoes === 0) missing.push('Registre a primeira evolução (+25 pontos)')
    if (clinica.total_usuarios <= 1) missing.push('Adicione mais usuários à equipe (+15 pontos)')
    if (!clinica.data_ativacao) missing.push('Ative a clínica (+20 pontos)')
    if (clinica.status !== 'ACTIVE') missing.push('Status ACTIVE garante +10 pontos')
    return missing
  }

  // MELHORIA 2: Templates WhatsApp
  function getWhatsAppTemplates(clinica: Clinica) {
    const templates = []
    
    // Template 1: Trial Expirando
    if (clinica.status === 'TRIAL') {
      templates.push({
        label: '⏰ Trial Expirando',
        message: `Oi, ${clinica.nome_fantasia}! 👋 Sou o Stefhone da equipe Clinix Power. Vi que seu período de teste expira em breve e você já tem ${clinica.total_pacientes} paciente(s) cadastrado(s)! Isso é ótimo! Posso te ajudar a continuar com tudo isso que você já construiu? 💪`
      })
    }
    
    // Template 2: Reativação
    if (clinica.status === 'SUSPENDED') {
      templates.push({
        label: '🔄 Reativação',
        message: `Oi, ${clinica.nome_fantasia}! 👋 Sou o Stefhone da Clinix Power. Vi que sua clínica está pausada e fiquei preocupado — você tinha ${clinica.total_pacientes} paciente(s) que dependem do sistema. Posso te ajudar a reativar? Tem alguma dificuldade que posso resolver? 🤝`
      })
    }
    
    // Template 3: Nunca Ativou
    if (!clinica.data_ativacao) {
      templates.push({
        label: '🚀 Nunca Ativou',
        message: `Oi, ${clinica.nome_fantasia}! 👋 Sou o Stefhone da Clinix Power. Vi que você se cadastrou mas ainda não ativou sua clínica. Tudo bem? Posso te ajudar com qualquer dúvida ou dificuldade no processo de ativação! É super rápido 🚀`
      })
    }
    
    // Template 4: Upsell PRO → ULTIMATE
    if (clinica.status === 'ACTIVE' && clinica.plano_nome === 'PRO') {
      templates.push({
        label: '⬆️ Upsell ULTIMATE',
        message: `Oi, ${clinica.nome_fantasia}! 👋 Sou o Stefhone da Clinix Power. Você está arrasando no PRO com ${clinica.total_pacientes} paciente(s)! Queria te contar que no ULTIMATE você teria IA Consultora Financeira + alertas de perda de pacientes + dashboard nível banking. Posso te mostrar como seria? 🔥`
      })
    }
    
    return templates
  }

  function enviarWhatsAppTemplate(whatsapp: string | null, mensagem: string) {
    if (!whatsapp) {
      alert('WhatsApp não cadastrado para esta clínica')
      return
    }
    const numero = whatsapp.replace(/\D/g, '')
    const mensagemEncoded = encodeURIComponent(mensagem)
    window.open(`https://wa.me/55${numero}?text=${mensagemEncoded}`, '_blank')
    setWhatsappDropdownOpen(null)
  }

  // MELHORIA 4: Anotações Privadas
  function carregarNota(clinicaId: string) {
    const nota = localStorage.getItem(`clinix_nota_${clinicaId}`)
    setNotaClinica(nota || '')
  }

  function salvarNota(clinicaId: string) {
    localStorage.setItem(`clinix_nota_${clinicaId}`, notaClinica)
    showToast('✅ Nota salva com sucesso!')
  }

  function temNota(clinicaId: string): boolean {
    return !!localStorage.getItem(`clinix_nota_${clinicaId}`)
  }

  function showToast(message: string) {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // MELHORIA 5: Dias sem atividade
  function getDiasSemAtividade(clinica: Clinica) {
    const diasCadastro = Math.ceil((Date.now() - new Date(clinica.data_cadastro).getTime()) / (1000 * 60 * 60 * 24))
    
    if (clinica.total_evolucoes === 0 && diasCadastro > 3) {
      return <div className="text-xs" style={{ color: '#f97316' }}>⚠️ Sem evoluções</div>
    }
    
    if (clinica.status === 'TRIAL' && clinica.data_expiracao_trial) {
      const diasRestantes = Math.ceil((new Date(clinica.data_expiracao_trial).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (diasRestantes >= 0) {
        return <div className="text-xs" style={{ color: '#eab308' }}>Expira em {diasRestantes} dia(s)</div>
      }
    }
    
    if (clinica.status === 'SUSPENDED') {
      const diasSuspensa = Math.ceil((Date.now() - new Date(clinica.data_cadastro).getTime()) / (1000 * 60 * 60 * 24))
      return <div className="text-xs" style={{ color: '#ef4444' }}>Suspensa há {diasSuspensa} dia(s)</div>
    }
    
    return null
  }

  // MELHORIA 6: Exportar Contatos
  function exportarContatos() {
    const ativas = clinicas.filter(c => c.status === 'ACTIVE' && c.whatsapp)
    const trial = clinicas.filter(c => c.status === 'TRIAL' && c.whatsapp)
    const suspensas = clinicas.filter(c => c.status === 'SUSPENDED' && c.whatsapp)
    const nuncaAtivaram = clinicas.filter(c => !c.data_ativacao && c.whatsapp)
    
    let texto = '=== CONTATOS CLINIX POWER ===\n'
    texto += `Data: ${new Date().toLocaleDateString('pt-BR')}\n\n`
    
    if (ativas.length > 0) {
      texto += `🟢 ATIVAS (${ativas.length} clínicas)\n`
      ativas.forEach(c => {
        texto += `• ${c.nome_fantasia} — ${formatPhone(c.whatsapp)} — ${c.plano_nome}\n`
      })
      texto += '\n'
    }
    
    if (trial.length > 0) {
      texto += `🟡 TRIAL (${trial.length} clínicas)\n`
      trial.forEach(c => {
        texto += `• ${c.nome_fantasia} — ${formatPhone(c.whatsapp)} — Expira em ${formatDate(c.data_expiracao_trial)}\n`
      })
      texto += '\n'
    }
    
    if (suspensas.length > 0) {
      texto += `🔴 SUSPENSAS (${suspensas.length} clínicas)\n`
      suspensas.forEach(c => {
        const dias = Math.ceil((Date.now() - new Date(c.data_cadastro).getTime()) / (1000 * 60 * 60 * 24))
        texto += `• ${c.nome_fantasia} — ${formatPhone(c.whatsapp)} — Suspensa há ${dias} dia(s)\n`
      })
      texto += '\n'
    }
    
    if (nuncaAtivaram.length > 0) {
      texto += `🟠 NUNCA ATIVARAM (${nuncaAtivaram.length} clínicas)\n`
      nuncaAtivaram.forEach(c => {
        texto += `• ${c.nome_fantasia} — ${formatPhone(c.whatsapp)} — Cadastrou em ${formatDate(c.data_cadastro)}\n`
      })
    }
    
    navigator.clipboard.writeText(texto)
    const total = ativas.length + trial.length + suspensas.length + nuncaAtivaram.length
    showToast(`✅ ${total} contatos copiados!`)
  }

  function getStatusBadge(status: string) {
    const styles = {
      TRIAL: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      ACTIVE: 'bg-green-100 text-green-700 border-green-300',
      SUSPENDED: 'bg-red-100 text-red-700 border-red-300',
      CANCELLED: 'bg-gray-100 text-gray-700 border-gray-300',
    }

    const labels = {
      TRIAL: 'TRIAL',
      ACTIVE: 'ATIVA',
      SUSPENDED: 'SUSPENSA',
      CANCELLED: 'CANCELADA',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  function abrirWhatsApp(whatsapp: string | null, nomeClinica: string) {
    if (!whatsapp) {
      alert('WhatsApp não cadastrado para esta clínica')
      return
    }
    const numero = whatsapp.replace(/\D/g, '')
    const mensagem = encodeURIComponent(
      `Olá! Sou da equipe Clinix Power. Vi que você cadastrou sua clínica "${nomeClinica}" e gostaria de conversar sobre como podemos ajudar sua clínica a crescer com nossa tecnologia. 😊`
    )
    window.open(`https://wa.me/55${numero}?text=${mensagem}`, '_blank')
  }

  return (
    <MasterAdminGate>
      <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, #f8fafc, #ffffff, rgba(243,232,255,0.3))' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #a855f7, #9333ea)' }}>
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'rgba(18,18,28,.92)', letterSpacing: '-.04em' }}>
                  Central de Controle — Master Admin
                </h1>
                <p className="text-sm" style={{ color: 'rgba(18,18,28,.50)' }}>
                  Visão completa do SaaS multiclínicas
                </p>
              </div>
              <div className="ml-auto">
                <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }}>
                  ACESSO TOTAL
                </span>
              </div>
            </div>
          </div>

          {/* Botões Atualizar e Exportar */}
          <div className="flex items-center justify-end gap-3 mb-6">
            <button
              onClick={exportarContatos}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition active:scale-95"
              style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }}
            >
              <Copy className="w-4 h-4" />
              📋 Exportar Contatos
            </button>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 active:scale-95"
              style={{ background: '#a855f7' }}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>

          {error && (
            <div className="mb-6 cp-card p-4" style={{ border: '2px solid #ef4444' }}>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="cp-card p-6 animate-pulse">
                  <div className="h-4 w-20 bg-slate-200 rounded mb-3" />
                  <div className="h-8 w-16 bg-slate-200 rounded mb-2" />
                  <div className="h-3 w-24 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : metricas ? (
            <>
              {/* Cards de Métricas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="cp-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(18,18,28,.50)' }}>Total Clínicas</span>
                    <Building2 className="w-5 h-5" style={{ color: '#a855f7' }} />
                  </div>
                  <div className="text-3xl font-bold" style={{ color: 'rgba(18,18,28,.92)' }}>{metricas.total_clinicas}</div>
                  <p className="text-xs mt-2" style={{ color: '#22c55e' }}>Sistema ativo</p>
                </div>

                <div className="cp-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(18,18,28,.50)' }}>Clínicas TRIAL</span>
                    <Calendar className="w-5 h-5" style={{ color: '#eab308' }} />
                  </div>
                  <div className="text-3xl font-bold" style={{ color: 'rgba(18,18,28,.92)' }}>{metricas.clinicas_trial}</div>
                  <p className="text-xs mt-2" style={{ color: 'rgba(18,18,28,.50)' }}>Período de teste</p>
                </div>

                <div className="cp-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(18,18,28,.50)' }}>Clínicas ATIVAS</span>
                    <TrendingUp className="w-5 h-5" style={{ color: '#22c55e' }} />
                  </div>
                  <div className="text-3xl font-bold" style={{ color: 'rgba(18,18,28,.92)' }}>{metricas.clinicas_ativas}</div>
                  <p className="text-xs mt-2" style={{ color: '#22c55e' }}>Pagantes</p>
                </div>

                <div className="cp-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(18,18,28,.50)' }}>Clínicas SUSPENSAS</span>
                    <AlertCircle className="w-5 h-5" style={{ color: '#ef4444' }} />
                  </div>
                  <div className="text-3xl font-bold" style={{ color: 'rgba(18,18,28,.92)' }}>{metricas.clinicas_suspensas}</div>
                  <p className="text-xs mt-2" style={{ color: '#ef4444' }}>Requer atenção</p>
                </div>
              </div>

              {/* Alertas Automáticos */}
              {(alertas.trialExpirando.length > 0 || alertas.suspensasAntigo.length > 0 || alertas.nuncaAtivadas.length > 0) && (
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                  {alertas.trialExpirando.length > 0 && (
                    <div className="cp-card p-4" style={{ border: '2px solid #eab308', background: 'rgba(234,179,8,0.05)' }}>
                      <h4 className="font-bold text-sm mb-2" style={{ color: '#eab308' }}>⚠️ Trial Expirando ({alertas.trialExpirando.length})</h4>
                      <ul className="space-y-1">
                        {alertas.trialExpirando.slice(0, 3).map(c => (
                          <li key={c.id} className="text-xs" style={{ color: 'rgba(18,18,28,.70)' }}>
                            • {c.nome_fantasia}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {alertas.suspensasAntigo.length > 0 && (
                    <div className="cp-card p-4" style={{ border: '2px solid #ef4444', background: 'rgba(239,68,68,0.05)' }}>
                      <h4 className="font-bold text-sm mb-2" style={{ color: '#ef4444' }}>🚨 Suspensas +7 dias ({alertas.suspensasAntigo.length})</h4>
                      <ul className="space-y-1">
                        {alertas.suspensasAntigo.slice(0, 3).map(c => (
                          <li key={c.id} className="text-xs" style={{ color: 'rgba(18,18,28,.70)' }}>
                            • {c.nome_fantasia}
                            {c.whatsapp && (
                              <button
                                onClick={() => abrirWhatsApp(c.whatsapp, c.nome_fantasia)}
                                className="ml-2 text-green-600 hover:text-green-700"
                              >
                                <MessageCircle className="w-3 h-3 inline" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {alertas.nuncaAtivadas.length > 0 && (
                    <div className="cp-card p-4" style={{ border: '2px solid #f97316', background: 'rgba(249,115,22,0.05)' }}>
                      <h4 className="font-bold text-sm mb-2" style={{ color: '#f97316' }}>📋 Nunca Ativadas ({alertas.nuncaAtivadas.length})</h4>
                      <ul className="space-y-1">
                        {alertas.nuncaAtivadas.slice(0, 3).map(c => (
                          <li key={c.id} className="text-xs" style={{ color: 'rgba(18,18,28,.70)' }}>
                            • {c.nome_fantasia}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Filtros e Busca */}
              <div className="cp-card p-4 mb-6">
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(18,18,28,.50)' }} />
                      <input
                        type="text"
                        placeholder="Buscar por nome, email, cidade..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border text-sm"
                        style={{ borderColor: 'rgba(0,0,0,0.12)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <select
                      value={filtroStatus}
                      onChange={(e) => setFiltroStatus(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border text-sm"
                      style={{ borderColor: 'rgba(0,0,0,0.12)' }}
                    >
                      <option value="TODOS">Todos os Status</option>
                      <option value="TRIAL">TRIAL</option>
                      <option value="ACTIVE">ATIVA</option>
                      <option value="SUSPENDED">SUSPENSA</option>
                      <option value="CANCELLED">CANCELADA</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={ordenacao}
                      onChange={(e) => setOrdenacao(e.target.value as any)}
                      className="w-full px-4 py-2 rounded-xl border text-sm"
                      style={{ borderColor: 'rgba(0,0,0,0.12)' }}
                    >
                      <option value="recente">Mais Recentes</option>
                      <option value="antigo">Mais Antigas</option>
                      <option value="nome">Nome A-Z</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tabela de Clínicas */}
              <div className="cp-card overflow-hidden">
                <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--stroke)' }}>
                  <h3 className="font-bold" style={{ fontSize: '1.1rem', color: 'rgba(18,18,28,.92)' }}>
                    Todas as Clínicas ({clinicasFiltradas.length})
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ background: 'rgba(248,249,252,.5)', borderBottom: '1px solid var(--stroke)' }}>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(18,18,28,.50)' }}>Clínica</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(18,18,28,.50)' }}>WhatsApp</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(18,18,28,.50)' }}>Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(18,18,28,.50)' }}>Saúde</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(18,18,28,.50)' }}>Plano</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(18,18,28,.50)' }}>Pacientes</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(18,18,28,.50)' }}>Usuários</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(18,18,28,.50)' }}>Cadastro</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(18,18,28,.50)' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--stroke)' }}>
                      {clinicasFiltradas.map((clinica) => (
                        <tr key={clinica.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold" style={{ color: 'rgba(18,18,28,.92)' }}>{clinica.nome_fantasia}</div>
                            <div className="text-xs" style={{ color: 'rgba(18,18,28,.50)' }}>{clinica.email}</div>
                            {clinica.cidade && <div className="text-xs" style={{ color: 'rgba(18,18,28,.40)' }}>{clinica.cidade}/{clinica.estado}</div>}
                          </td>
                          <td className="px-6 py-4">
                            {clinica.whatsapp ? (
                              <div className="relative">
                                <button
                                  onClick={() => setWhatsappDropdownOpen(whatsappDropdownOpen === clinica.id ? null : clinica.id)}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition hover:opacity-90"
                                  style={{ background: '#22c55e' }}
                                  title={formatPhone(clinica.whatsapp)}
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  Contatar
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                                {whatsappDropdownOpen === clinica.id && (
                                  <div className="absolute z-10 mt-1 w-64 cp-card p-2 shadow-lg">
                                    {getWhatsAppTemplates(clinica).map((template, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => enviarWhatsAppTemplate(clinica.whatsapp, template.message)}
                                        className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-50 transition"
                                        style={{ color: 'rgba(18,18,28,.92)' }}
                                      >
                                        {template.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs" style={{ color: 'rgba(18,18,28,.30)' }}>Não cadastrado</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(clinica.status)}
                            {clinica.plano_nome === 'TESTE_INTERNO' && (
                              <div className="mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }}>
                                  🧪 TESTE
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {getHealthBadge(calcHealthScore(clinica))}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium" style={{ color: 'rgba(18,18,28,.92)' }}>{clinica.plano_nome}</div>
                            <div className="text-xs" style={{ color: 'rgba(18,18,28,.50)' }}>{formatCurrency(clinica.plano_valor)}/mês</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium" style={{ color: 'rgba(18,18,28,.92)' }}>{clinica.total_pacientes}</div>
                            <div className="text-xs" style={{ color: 'rgba(18,18,28,.50)' }}>{clinica.total_evolucoes} evoluções</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium" style={{ color: 'rgba(18,18,28,.92)' }}>{clinica.total_usuarios}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm" style={{ color: 'rgba(18,18,28,.92)' }}>{formatDate(clinica.data_cadastro)}</div>
                            {getDiasSemAtividade(clinica)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setClinicaSelecionada(clinica)
                                  carregarNota(clinica.id)
                                  setShowModal(true)
                                }}
                                className="p-2 rounded-lg transition hover:bg-purple-50"
                                style={{ color: '#a855f7' }}
                                title="Ver Detalhes"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {temNota(clinica.id) && (
                                <span className="text-xs" title="Tem anotação privada">📝</span>
                              )}
                              <button
                                onClick={() => toggleStatus(clinica.id, clinica.status)}
                                className={`p-2 rounded-lg transition ${
                                  clinica.status === 'SUSPENDED' 
                                    ? 'hover:bg-green-50 text-green-600' 
                                    : 'hover:bg-red-50 text-red-600'
                                }`}
                                title={clinica.status === 'SUSPENDED' ? 'Reativar' : 'Suspender'}
                              >
                                {clinica.status === 'SUSPENDED' ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {clinicasFiltradas.length === 0 && (
                    <div className="px-6 py-12 text-center">
                      <Building2 className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(18,18,28,.20)' }} />
                      <p className="text-sm font-medium" style={{ color: 'rgba(18,18,28,.50)' }}>
                        {busca || filtroStatus !== 'TODOS' ? 'Nenhuma clínica encontrada com os filtros aplicados' : 'Nenhuma clínica cadastrada ainda'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Métricas Financeiras */}
              <div className="mt-8 cp-card p-6">
                <h3 className="font-bold mb-4" style={{ fontSize: '1.1rem', color: 'rgba(18,18,28,.92)' }}>
                  Métricas Financeiras
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(18,18,28,.50)' }}>Receita Total</div>
                    <div className="text-2xl font-bold" style={{ color: '#22c55e' }}>{formatCurrency(metricas.receita_total)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(18,18,28,.50)' }}>MRR Estimado</div>
                    <div className="text-2xl font-bold" style={{ color: '#a855f7' }}>
                      {formatCurrency(clinicas.filter(c => c.status === 'ACTIVE').reduce((sum, c) => sum + c.plano_valor, 0))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(18,18,28,.50)' }}>Ticket Médio</div>
                    <div className="text-2xl font-bold" style={{ color: 'rgba(18,18,28,.92)' }}>
                      {formatCurrency(metricas.clinicas_ativas > 0 ? metricas.receita_total / metricas.clinicas_ativas : 0)}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Modal Detalhes */}
      {showModal && clinicaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="cp-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: 'rgba(18,18,28,.92)' }}>
                Detalhes da Clínica
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(18,18,28,.50)' }}>Nome Fantasia</div>
                <div className="text-sm font-medium" style={{ color: 'rgba(18,18,28,.92)' }}>{clinicaSelecionada.nome_fantasia}</div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(18,18,28,.50)' }}>CNPJ</div>
                  <div className="text-sm" style={{ color: 'rgba(18,18,28,.92)' }}>{formatCNPJ(clinicaSelecionada.cnpj)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(18,18,28,.50)' }}>WhatsApp</div>
                  <div className="text-sm" style={{ color: 'rgba(18,18,28,.92)' }}>{formatPhone(clinicaSelecionada.whatsapp)}</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(18,18,28,.50)' }}>Email</div>
                  <div className="text-sm" style={{ color: 'rgba(18,18,28,.92)' }}>{clinicaSelecionada.email}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(18,18,28,.50)' }}>Telefone</div>
                  <div className="text-sm" style={{ color: 'rgba(18,18,28,.92)' }}>{formatPhone(clinicaSelecionada.telefone)}</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(18,18,28,.50)' }}>Cidade</div>
                  <div className="text-sm" style={{ color: 'rgba(18,18,28,.92)' }}>{clinicaSelecionada.cidade || '-'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(18,18,28,.50)' }}>Estado</div>
                  <div className="text-sm" style={{ color: 'rgba(18,18,28,.92)' }}>{clinicaSelecionada.estado || '-'}</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(18,18,28,.50)' }}>Status</div>
                  {getStatusBadge(clinicaSelecionada.status)}
                </div>
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(18,18,28,.50)' }}>Plano</div>
                  <div className="text-sm font-medium" style={{ color: 'rgba(18,18,28,.92)' }}>
                    {clinicaSelecionada.plano_nome} - {formatCurrency(clinicaSelecionada.plano_valor)}/mês
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(18,18,28,.50)' }}>Total Pacientes</div>
                  <div className="text-lg font-bold" style={{ color: 'rgba(18,18,28,.92)' }}>{clinicaSelecionada.total_pacientes}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(18,18,28,.50)' }}>Total Usuários</div>
                  <div className="text-lg font-bold" style={{ color: 'rgba(18,18,28,.92)' }}>{clinicaSelecionada.total_usuarios}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(18,18,28,.50)' }}>Total Evoluções</div>
                  <div className="text-lg font-bold" style={{ color: 'rgba(18,18,28,.92)' }}>{clinicaSelecionada.total_evolucoes}</div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(18,18,28,.50)' }}>Data Cadastro</div>
                  <div className="text-sm" style={{ color: 'rgba(18,18,28,.92)' }}>{formatDate(clinicaSelecionada.data_cadastro)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(18,18,28,.50)' }}>Data Ativação</div>
                  <div className="text-sm" style={{ color: 'rgba(18,18,28,.92)' }}>{formatDate(clinicaSelecionada.data_ativacao)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(18,18,28,.50)' }}>Expiração Trial</div>
                  <div className="text-sm" style={{ color: 'rgba(18,18,28,.92)' }}>{formatDate(clinicaSelecionada.data_expiracao_trial)}</div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(18,18,28,.50)' }}>Receita Total</div>
                <div className="text-2xl font-bold" style={{ color: '#22c55e' }}>{formatCurrency(clinicaSelecionada.receita_total)}</div>
              </div>

              {/* MELHORIA 1: Health Score com barra de progresso */}
              <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(248,249,252,.8)', border: '1px solid var(--stroke)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold" style={{ color: 'rgba(18,18,28,.50)' }}>Health Score da Clínica</div>
                  <div className="text-lg font-bold" style={{ color: '#a855f7' }}>{calcHealthScore(clinicaSelecionada)}/100</div>
                </div>
                <div className="w-full h-3 rounded-full" style={{ background: 'rgba(0,0,0,0.08)' }}>
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${calcHealthScore(clinicaSelecionada)}%`,
                      background: calcHealthScore(clinicaSelecionada) >= 80 ? '#22c55e' : calcHealthScore(clinicaSelecionada) >= 50 ? '#eab308' : '#ef4444'
                    }}
                  />
                </div>
                {getHealthScoreMessage(clinicaSelecionada, calcHealthScore(clinicaSelecionada)).length > 0 && (
                  <div className="mt-3 space-y-1">
                    <div className="text-xs font-semibold" style={{ color: 'rgba(18,18,28,.70)' }}>Para melhorar o score:</div>
                    {getHealthScoreMessage(clinicaSelecionada, calcHealthScore(clinicaSelecionada)).map((msg, idx) => (
                      <div key={idx} className="text-xs" style={{ color: 'rgba(18,18,28,.60)' }}>• {msg}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* MELHORIA 3: Linha do Tempo (Jornada da Clínica) */}
              <div className="mt-6">
                <h4 className="text-sm font-bold mb-4" style={{ color: 'rgba(18,18,28,.92)' }}>Jornada da Clínica</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#22c55e' }} />
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: 'rgba(18,18,28,.92)' }}>Cadastrou no sistema</div>
                      <div className="text-xs" style={{ color: 'rgba(18,18,28,.50)' }}>{formatDate(clinicaSelecionada.data_cadastro)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    {clinicaSelecionada.pagamento_ativacao_confirmado ? (
                      <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#22c55e' }} />
                    ) : (
                      <Circle className="w-5 h-5 shrink-0" style={{ color: 'rgba(18,18,28,.30)' }} />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: clinicaSelecionada.pagamento_ativacao_confirmado ? 'rgba(18,18,28,.92)' : 'rgba(18,18,28,.50)' }}>Pagou ativação</div>
                      <div className="text-xs" style={{ color: 'rgba(18,18,28,.50)' }}>{clinicaSelecionada.pagamento_ativacao_confirmado ? 'Confirmado' : 'Pendente'}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    {clinicaSelecionada.total_pacientes > 0 ? (
                      <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#22c55e' }} />
                    ) : (
                      <Circle className="w-5 h-5 shrink-0" style={{ color: 'rgba(18,18,28,.30)' }} />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: clinicaSelecionada.total_pacientes > 0 ? 'rgba(18,18,28,.92)' : 'rgba(18,18,28,.50)' }}>Primeiro paciente</div>
                      <div className="text-xs" style={{ color: 'rgba(18,18,28,.50)' }}>{clinicaSelecionada.total_pacientes > 0 ? `${clinicaSelecionada.total_pacientes} paciente(s)` : 'Nenhum paciente ainda'}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    {clinicaSelecionada.total_evolucoes > 0 ? (
                      <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#22c55e' }} />
                    ) : (
                      <Circle className="w-5 h-5 shrink-0" style={{ color: 'rgba(18,18,28,.30)' }} />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: clinicaSelecionada.total_evolucoes > 0 ? 'rgba(18,18,28,.92)' : 'rgba(18,18,28,.50)' }}>Primeira evolução</div>
                      <div className="text-xs" style={{ color: 'rgba(18,18,28,.50)' }}>{clinicaSelecionada.total_evolucoes > 0 ? `${clinicaSelecionada.total_evolucoes} evoluções` : 'Nenhuma evolução ainda'}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    {clinicaSelecionada.status === 'ACTIVE' ? (
                      <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#22c55e' }} />
                    ) : (
                      <Circle className="w-5 h-5 shrink-0" style={{ color: 'rgba(18,18,28,.30)' }} />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: clinicaSelecionada.status === 'ACTIVE' ? 'rgba(18,18,28,.92)' : 'rgba(18,18,28,.50)' }}>Assinou plano</div>
                      <div className="text-xs" style={{ color: 'rgba(18,18,28,.50)' }}>{clinicaSelecionada.status === 'ACTIVE' ? `Plano ${clinicaSelecionada.plano_nome}` : 'Ainda não assinou'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* MELHORIA 4: Anotações Privadas */}
              <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <StickyNote className="w-4 h-4" style={{ color: '#a855f7' }} />
                  <div className="text-xs font-semibold" style={{ color: '#a855f7' }}>Anotações Privadas</div>
                </div>
                <textarea
                  value={notaClinica}
                  onChange={(e) => setNotaClinica(e.target.value)}
                  placeholder="Anotações privadas sobre esta clínica... (salvo localmente)"
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ borderColor: 'rgba(168,85,247,0.2)', minHeight: '80px' }}
                />
                <button
                  onClick={() => salvarNota(clinicaSelecionada.id)}
                  className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                  style={{ background: '#a855f7', color: 'white' }}
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar Nota
                </button>
              </div>

              {clinicaSelecionada.whatsapp && (
                <button
                  onClick={() => {
                    abrirWhatsApp(clinicaSelecionada.whatsapp, clinicaSelecionada.nome_fantasia)
                    setShowModal(false)
                  }}
                  className="w-full mt-4 py-3 rounded-xl text-sm font-semibold text-white transition"
                  style={{ background: '#22c55e' }}
                >
                  <MessageCircle className="w-4 h-4 inline mr-2" />
                  Contatar via WhatsApp
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast de Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 cp-card px-4 py-3 shadow-lg animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium" style={{ color: 'rgba(18,18,28,.92)' }}>{toastMessage}</div>
          </div>
        </div>
      )}
    </MasterAdminGate>
  )
}
