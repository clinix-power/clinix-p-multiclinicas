'use client'

import { useEffect, useState, useTransition, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, FileText, Printer, Settings, User, Calendar, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useReactToPrint } from 'react-to-print'
import ConfiguracaoClinicaModal from '@/components/ConfiguracaoClinicaModal'
import LaudoDocumento from '@/components/LaudoDocumento'

type PacienteMini = {
  id: string
  nome: string
  data_nascimento: string | null
}

type Anamnese = {
  id: string
  paciente_id: string
  profissional_id: string
  data_avaliacao: string
  qp: string | null
  hda: string | null
  exames_complementares: string | null
  diagnostico_fisio: string | null
  conduta: string | null
  assinatura_digital: string | null
  metadados: any
}

type Evolucao = {
  id: string
  paciente_id: string
  profissional_id: string
  data_hora: string
  texto_original: string | null
  texto_melhorado_ia?: string | null
}

type Profissional = {
  id: string
  nome: string
  profissao: string | null
  registro_tipo: string | null
  registro_numero: string | null
}

type ConfiguracaoClinica = {
  id?: string
  nome_fantasia: string
  endereco_completo: string
  responsavel_tecnico: string
  documento_responsavel: string
  tipo_documento: string
}

type LaudoData = {
  paciente: PacienteMini
  anamnese: Anamnese
  evolucoes: Evolucao[]
  profissionais: Record<string, Profissional>
}

function formatDateBR(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function formatDateTimeBR(iso: string) {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} às ${hh}:${mi}`
}

function getMonthYear(iso: string) {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}/${yyyy}`
}

function MonthSeparator({ monthYear }: { monthYear: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-200 to-transparent" />
      <div className="px-4 py-1.5 rounded-full bg-purple-50 border border-purple-200">
        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">{monthYear}</p>
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-200 to-transparent" />
    </div>
  )
}

function CarimboProfissional({ profissional, assinatura }: { profissional: Profissional; assinatura?: string | null }) {
  return (
    <div className="mt-6 pt-4 border-t border-slate-200">
      <div className="flex items-end justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">{profissional.nome}</p>
          {profissional.profissao && (
            <p className="text-xs text-slate-600 mt-0.5">{profissional.profissao}</p>
          )}
          {profissional.registro_tipo && profissional.registro_numero && (
            <p className="text-xs text-slate-600 mt-0.5">
              {profissional.registro_tipo} {profissional.registro_numero}
            </p>
          )}
        </div>
        {assinatura && (
          <div className="shrink-0">
            <img src={assinatura} alt="Assinatura" className="h-16 w-auto" />
          </div>
        )}
      </div>
    </div>
  )
}

export default function LaudosAdminPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const laudoRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [pacientes, setPacientes] = useState<PacienteMini[]>([])
  const [selectedPacienteId, setSelectedPacienteId] = useState('')
  const [laudoData, setLaudoData] = useState<LaudoData | null>(null)
  const [configuracao, setConfiguracao] = useState<ConfiguracaoClinica | null>(null)
  const [showConfigModal, setShowConfigModal] = useState(false)

  useEffect(() => {
    loadPacientes()
    loadConfiguracao()
  }, [])

  async function loadConfiguracao() {
    try {
      const { data: s } = await supabase.auth.getSession()
      const userId = s.session?.user?.id
      if (!userId) return
      const { data: myProfile } = await supabase
        .from('profiles').select('clinica_id').eq('id', userId).single()

      let q = supabase.from('configuracoes_clinica').select('*').limit(1)
      if (myProfile?.clinica_id) q = (q as any).eq('clinica_id', myProfile.clinica_id)
      const { data } = await q.single()

      if (data) setConfiguracao(data as ConfiguracaoClinica)
    } catch (e) {
      // Configuração não existe ainda
    }
  }

  async function loadPacientes() {
    try {
      const { data: s } = await supabase.auth.getSession()
      const userId = s.session?.user?.id
      if (!userId) { setLoading(false); return }
      const { data: myProfile } = await supabase
        .from('profiles').select('clinica_id').eq('id', userId).single()

      let q = supabase
        .from('pacientes')
        .select('id, nome, data_nascimento')
        .order('nome', { ascending: true })
      if (myProfile?.clinica_id) q = (q as any).eq('clinica_id', myProfile.clinica_id)
      const { data, error } = await q

      if (error) throw error
      setPacientes((data ?? []) as PacienteMini[])
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar pacientes')
    } finally {
      setLoading(false)
    }
  }

  async function generateLaudo() {
    if (!selectedPacienteId) {
      setError('Selecione um paciente')
      return
    }

    setGenerating(true)
    setError(null)
    setLaudoData(null)

    try {
      // 1. Buscar paciente
      const { data: pacienteData, error: pacienteError } = await supabase
        .from('pacientes')
        .select('id, nome, data_nascimento')
        .eq('id', selectedPacienteId)
        .single()

      if (pacienteError) throw pacienteError
      if (!pacienteData) throw new Error('Paciente não encontrado')

      // 1.5. Buscar clinica_id do usuário atual
      const { data: userData } = await supabase.auth.getUser()
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('clinica_id')
        .eq('id', userData?.user?.id || '')
        .single()

      // 2. Buscar anamnese (mais recente)
      let anamQ = supabase
        .from('anamneses')
        .select('*')
        .eq('paciente_id', selectedPacienteId)
        .order('data_avaliacao', { ascending: false })
        .limit(1)
      
      if (myProfile?.clinica_id) {
        anamQ = (anamQ as any).eq('clinica_id', myProfile.clinica_id)
      }
      
      const { data: anamneseData, error: anamneseError } = await anamQ.single()

      if (anamneseError && anamneseError.code !== 'PGRST116') throw anamneseError
      if (!anamneseData) {
        setError('Nenhuma anamnese encontrada para este paciente')
        setGenerating(false)
        return
      }

      // 3. Buscar TODAS as evoluções
      const { data: evolucoesData, error: evolucoesError } = await supabase
        .from('evolucoes_clinicas')
        .select('id, paciente_id, profissional_id, data_hora, texto_original')
        .eq('paciente_id', selectedPacienteId)
        .order('data_hora', { ascending: true })

      if (evolucoesError) throw evolucoesError

      const evolucoes = (evolucoesData ?? []) as Evolucao[]

      // 4. Buscar profissionais
      const profIds = Array.from(
        new Set([anamneseData.profissional_id, ...evolucoes.map((e) => e.profissional_id)])
      ).filter(Boolean)

      const { data: profData } = await supabase
        .from('profiles')
        .select('id, nome, profissao, registro_tipo, registro_numero')
        .in('id', profIds)

      const profMap: Record<string, Profissional> = {}
      profData?.forEach((p: any) => (profMap[p.id] = p))

      setLaudoData({
        paciente: pacienteData as PacienteMini,
        anamnese: anamneseData as Anamnese,
        evolucoes,
        profissionais: profMap,
      })
    } catch (e: any) {
      setError(e?.message || 'Erro ao gerar laudo')
    } finally {
      setGenerating(false)
    }
  }

  const handlePrint = useReactToPrint({
    contentRef: laudoRef,
    documentTitle: `Laudo_${laudoData?.paciente?.nome?.replace(/\s+/g, '_') || 'Paciente'}_${new Date().toISOString().split('T')[0]}`,
    onBeforePrint: async () => {
      // Ensure content is ready before printing
      if (!laudoRef.current) {
        console.error('Ref não está pronta para impressão')
        throw new Error('Conteúdo não disponível')
      }
    },
  })

  function handleGenerateLaudo() {
    if (!configuracao) {
      setShowConfigModal(true)
    } else {
      generateLaudo()
    }
  }

  function handleConfigSave(config: ConfiguracaoClinica) {
    setConfiguracao(config)
    generateLaudo()
  }

  // Agrupar evoluções por mês
  const evolucoesGroupedByMonth = laudoData?.evolucoes.reduce((acc, evo) => {
    const monthYear = getMonthYear(evo.data_hora)
    if (!acc[monthYear]) acc[monthYear] = []
    acc[monthYear].push(evo)
    return acc
  }, {} as Record<string, Evolucao[]>)

  const monthYears = evolucoesGroupedByMonth ? Object.keys(evolucoesGroupedByMonth).sort() : []

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
        <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
          {/* Header Skeleton */}
          <div className="mb-8 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-slate-200 animate-pulse" />
            <div className="flex-1">
              <div className="h-7 w-64 bg-slate-200 rounded-lg animate-pulse mb-2" />
              <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
          
          {/* Content Skeleton */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
              <div className="h-11 w-full bg-slate-200 rounded-xl animate-pulse" />
              <div className="h-12 w-full bg-slate-200 rounded-xl animate-pulse" />
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 h-64 bg-slate-100 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 pb-24 md:pb-8">
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        {/* Premium Glassmorphism Header */}
        <div className="mb-8 sticky top-0 z-10 -mx-4 px-4 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 print:hidden">
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
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Central de Laudos</h1>
                  <p className="text-xs md:text-sm text-slate-600">Prontuário fisioterapêutico completo</p>
                </div>
              </div>
            </div>
            {configuracao && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium text-green-700">Clínica Configurada</span>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 print:hidden">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Configuration Required Banner */}
        {!laudoData && !configuracao && (
          <div className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/80 backdrop-blur-sm p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 print:hidden">
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Settings className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">Configuração Necessária</p>
              <p className="text-xs text-amber-700 mt-0.5">Configure os dados da clínica antes de gerar laudos. O documento requer nome fantasia, endereço e responsável técnico.</p>
            </div>
            <button
              onClick={() => setShowConfigModal(true)}
              className="shrink-0 h-10 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-all shadow-md shadow-amber-500/20"
            >
              Configurar Agora
            </button>
          </div>
        )}

        {/* Responsive Grid Layout */}
        {!laudoData && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Seleção de Paciente - Card Premium */}
            <div className="rounded-3xl border border-slate-200/60 bg-white/90 backdrop-blur-xl p-6 md:p-8 shadow-lg shadow-slate-900/5 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Selecionar Paciente</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Paciente</label>
                  <select
                    value={selectedPacienteId}
                    onChange={(e) => setSelectedPacienteId(e.target.value)}
                    className="w-full h-12 md:h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/10 outline-none transition text-base md:text-sm"
                  >
                    <option value="">Selecione um paciente</option>
                    {pacientes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mobile: Full width button, Desktop: Fit content */}
                <button
                  onClick={() => startTransition(() => handleGenerateLaudo())}
                  disabled={!selectedPacienteId || generating || isPending}
                  className="w-full min-h-[44px] h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-semibold hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/35 flex items-center justify-center gap-2.5 active:scale-[0.97]"
                >
                  <FileText className="h-5 w-5" />
                  {generating || isPending ? 'Gerando Laudo...' : 'Gerar Laudo Completo'}
                </button>

                {!configuracao && (
                  <button
                    onClick={() => setShowConfigModal(true)}
                    className="w-full min-h-[44px] h-11 rounded-2xl border border-purple-200/60 bg-white/70 backdrop-blur text-purple-700 text-sm font-semibold hover:bg-purple-50 transition-all shadow-sm flex items-center justify-center gap-2.5 active:scale-[0.97]"
                  >
                    <Settings className="h-4 w-4" />
                    Configurar Clínica Primeiro
                  </button>
                )}
              </div>
            </div>

            {/* Info Card - Desktop Only */}
            <div className="hidden md:block rounded-3xl border border-slate-200/60 bg-gradient-to-br from-purple-50 to-white p-8 shadow-lg">
              <div className="space-y-6">
                <div>
                  <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Laudo Profissional</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Gere laudos fisioterapêuticos completos com padrão hospitalar, incluindo anamnese, evoluções clínicas e assinatura digital.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Compliance CREFITO-MG</p>
                      <p className="text-xs text-slate-600">Documento em conformidade com normas</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Formato A4 Profissional</p>
                      <p className="text-xs text-slate-600">Pronto para impressão e auditoria</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Código de Autenticidade</p>
                      <p className="text-xs text-slate-600">Hash único para rastreabilidade</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Configuração */}
        <ConfiguracaoClinicaModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          onSave={handleConfigSave}
        />

        {/* Overlay de Renderização */}
        {generating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 shadow-2xl text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-r-transparent mb-4"></div>
              <p className="text-lg font-semibold text-slate-900">Renderizando Laudo em Alta Definição...</p>
              <p className="text-sm text-slate-600 mt-2">Aguarde enquanto preparamos o documento</p>
            </div>
          </div>
        )}

        {/* Laudo Gerado - Premium Layout */}
        {laudoData && configuracao && (
          <div className="space-y-6">
            {/* Action Buttons - Mobile Optimized */}
            <div className="flex flex-col md:flex-row gap-3">
              <button
                onClick={() => {
                  if (!laudoRef.current) {
                    setError('Conteúdo do laudo não está disponível. Tente gerar novamente.')
                    return
                  }
                  if (typeof handlePrint === 'function') {
                    setGenerating(true)
                    setError(null)
                    try {
                      handlePrint()
                      setTimeout(() => setGenerating(false), 1000)
                    } catch (err: any) {
                      console.error('Erro ao imprimir:', err)
                      setError('Erro ao gerar PDF. Tente novamente.')
                      setGenerating(false)
                    }
                  } else {
                    setError('Motor de impressão não inicializado. Recarregue a página.')
                  }
                }}
                disabled={!laudoData || !configuracao || generating}
                className="flex-1 min-h-[44px] px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/35 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
              >
                <Printer className="h-5 w-5" />
                {generating ? 'Gerando PDF...' : 'Imprimir / Salvar PDF'}
              </button>
              <button
                onClick={() => setShowConfigModal(true)}
                className="min-h-[44px] px-5 rounded-2xl border border-purple-200/40 bg-white/70 backdrop-blur text-slate-700 text-sm font-semibold hover:bg-purple-50/60 transition-all shadow-sm hover:shadow flex items-center justify-center gap-2.5"
              >
                <Settings className="h-4 w-4 text-purple-500" />
                <span className="hidden md:inline">Configurar</span>
                <span className="md:hidden">Configurar Clínica</span>
              </button>
              <button
                onClick={() => { setLaudoData(null); setSelectedPacienteId('') }}
                className="min-h-[44px] px-5 rounded-2xl border border-purple-200/40 bg-white/70 backdrop-blur text-slate-700 text-sm font-semibold hover:bg-purple-50/60 transition-all shadow-sm hover:shadow flex items-center justify-center gap-2.5"
              >
                <ArrowLeft className="h-4 w-4 text-purple-500" />
                Voltar
              </button>
            </div>

            {/* Preview Card - Enhanced */}
            <div className="rounded-3xl border border-slate-200/60 bg-white shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-white" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Laudo Pronto</h3>
                    <p className="text-xs text-purple-100">Documento gerado com sucesso</p>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-purple-50 mb-4">
                    <FileText className="h-10 w-10 text-purple-600" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Documento Pronto para Impressão</h4>
                  <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
                    Clique no botão "Imprimir / Salvar PDF" acima para gerar o documento em formato A4 profissional
                  </p>
                  
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-xl border border-purple-100">
                      <span className="text-xs font-medium text-purple-900">Código: CP-{laudoData.anamnese.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                    
                    <div className="flex items-center justify-center gap-6 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{laudoData.paciente.nome}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDateBR(laudoData.anamnese.data_avaliacao)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Documento Oculto para Impressão - Sempre no DOM (overflow:hidden, não display:none, para que o motor de print calcule a altura real) */}
        <div style={{ overflow: 'hidden', height: 0 }}>
          <div ref={laudoRef} style={{ overflow: 'visible' }}>
            {laudoData && configuracao && (
              <LaudoDocumento
                configuracao={configuracao}
                paciente={laudoData.paciente}
                anamnese={laudoData.anamnese}
                evolucoes={laudoData.evolucoes}
                profissionais={laudoData.profissionais}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
