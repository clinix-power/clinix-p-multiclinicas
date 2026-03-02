'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import PageHeader from '@/components/ui/page-header'
import SignaturePad from '@/components/SignatureCanvas'
import { Activity, AlertCircle, CheckCircle2, Cloud, FileText, Heart, Save, User } from 'lucide-react'

type PacienteMini = {
  id: string
  nome: string
  data_nascimento: string | null
}

type AnamneseForm = {
  paciente_id: string
  qp: string
  hda: string
  exames_complementares: string
  diagnostico_fisio: string
  conduta: string
  assinatura_digital: string
  metadados: {
    fumante: string
    atividade_fisica: string
    historico_familiar: string[]
    dor_eva: number
    localizacao_dor: string
    irradiacao: string
    fatores_melhora: string[]
    fatores_piora: string[]
  }
}

const emptyForm: AnamneseForm = {
  paciente_id: '',
  qp: '',
  hda: '',
  exames_complementares: '',
  diagnostico_fisio: '',
  conduta: '',
  assinatura_digital: '',
  metadados: {
    fumante: 'Não',
    atividade_fisica: 'Sedentário',
    historico_familiar: [],
    dor_eva: 0,
    localizacao_dor: '',
    irradiacao: '',
    fatores_melhora: [],
    fatores_piora: [],
  },
}

const FUMANTE_OPTIONS = ['Não', 'Sim', 'Ex-fumante']
const ATIVIDADE_FISICA_OPTIONS = ['Sedentário', 'Leve', 'Moderado', 'Intenso']
const HISTORICO_FAMILIAR_OPTIONS = ['Diabetes', 'Hipertensão', 'Cardiopatia', 'AVC', 'Câncer', 'Nenhum']
const FATORES_OPTIONS = ['Repouso', 'Movimento', 'Esforço físico', 'Frio', 'Calor', 'Estresse', 'Postura']

export default function AvaliacaoAdmissionalPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [pacientes, setPacientes] = useState<PacienteMini[]>([])
  const [form, setForm] = useState<AnamneseForm>(emptyForm)
  const [step, setStep] = useState(1)
  const [showSignatureFullscreen, setShowSignatureFullscreen] = useState(false)

  const progressPercentage = Math.round((step / 4) * 100)

  useEffect(() => {
    loadPacientes()
  }, [])

  async function loadPacientes() {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (!userId) throw new Error('Sessão expirada')

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('clinica_id')
        .eq('id', userId)
        .single()

      const { data, error } = await supabase
        .from('pacientes')
        .select('id, nome, data_nascimento')
        .eq('clinica_id', myProfile?.clinica_id)
        .order('nome', { ascending: true })

      if (error) throw error
      setPacientes((data ?? []) as PacienteMini[])
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar pacientes')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!form.paciente_id) {
      setError('Selecione um paciente')
      return
    }

    if (!form.assinatura_digital) {
      setError('Assinatura digital é obrigatória')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id

      if (!userId) {
        throw new Error('Sessão expirada')
      }

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('clinica_id')
        .eq('id', userId)
        .single()

      const { error: insertError } = await supabase.from('anamneses').insert({
        paciente_id: form.paciente_id,
        profissional_id: userId,
        clinica_id: myProfile?.clinica_id,
        qp: form.qp,
        hda: form.hda,
        exames_complementares: form.exames_complementares,
        diagnostico_fisio: form.diagnostico_fisio,
        conduta: form.conduta,
        assinatura_digital: form.assinatura_digital,
        metadados: form.metadados,
      })

      if (insertError) throw insertError

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard-funcionario')
      }, 2000)
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar avaliação')
    } finally {
      setSaving(false)
    }
  }

  const toggleArrayItem = (array: string[], item: string) => {
    if (array.includes(item)) {
      return array.filter((i) => i !== item)
    }
    return [...array, item]
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-r-transparent"></div>
          <p className="mt-3 text-sm text-slate-600">Carregando...</p>
        </div>
      </div>
    )
  }

  // --- Design System de Alto Padrão (Método 1 Milhão) ---
  const luxuryContainer = "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
  const luxuryCard = "rounded-[32px] bg-white/80 backdrop-blur-md border border-white/20 shadow-2xl p-6 md:p-8"
  const luxuryInput = "w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all text-sm shadow-sm"
  const luxuryTextArea = "w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 outline-none resize-none transition-all shadow-sm text-sm"
  const luxuryLabel = "block text-sm font-semibold text-slate-700 mb-2 ml-1"
  const luxuryButtonPrimary = "w-full h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 active:scale-[0.98]"
  const luxuryButtonSecondary = "w-full h-12 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all shadow-sm hover:shadow active:scale-[0.98]"
  const luxuryStepIndicator = (active: boolean, completed: boolean) => `h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 ${active ? 'bg-purple-600 text-white ring-4 ring-purple-100 shadow-lg shadow-purple-500/30' : completed ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className={luxuryContainer}>
        {/* Header Premium com PageHeader */}
        <PageHeader 
          title="Avaliação Admissional" 
          subtitle="Protocolo de avaliação fisioterapêutica completo"
          icon={Activity}
          showBackButton={true}
        />

        {/* Progress Indicator - Premium Redesign */}
        <div className="mb-10 mt-6 px-2">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Progresso</span>
            <span className="text-sm font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">{progressPercentage}%</span>
          </div>
          <div className="relative">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 rounded-full -z-10" />
            <div 
              className="absolute top-1/2 left-0 h-1 bg-purple-500 rounded-full -z-10 transition-all duration-500" 
              style={{ width: `${progressPercentage}%` }} 
            />
            <div className="flex justify-between items-center">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <div className={luxuryStepIndicator(s === step, s < step)}>
                    {s < step ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-sm font-bold">{s}</span>}
                  </div>
                  <span className={`text-xs font-semibold ${s === step ? 'text-purple-700' : 'text-slate-400'} hidden md:block`}>
                    {s === 1 ? 'Dados' : s === 2 ? 'Anamnese' : s === 3 ? 'Clínico' : 'Assinatura'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-8 rounded-[24px] border border-red-100 bg-red-50/50 p-4 flex items-start gap-3 shadow-sm backdrop-blur-sm">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-8 rounded-[24px] border border-green-100 bg-green-50/50 p-4 flex items-start gap-3 shadow-sm backdrop-blur-sm">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 font-medium">Avaliação salva com sucesso! Redirecionando...</p>
          </div>
        )}

        {/* Form Content - Card de Luxo Centralizado */}
        <div className={luxuryCard}>
          {/* Step 1: Seleção de Paciente e Dados Rápidos */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-2 pb-6 border-b border-slate-100">
                <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Dados do Paciente</h2>
                  <p className="text-sm text-slate-500">Informações iniciais para o prontuário</p>
                </div>
              </div>

              <div className="grid gap-8">
                <div>
                  <label className={luxuryLabel}>Paciente *</label>
                  <div className="relative">
                    <select
                      value={form.paciente_id}
                      onChange={(e) => setForm({ ...form, paciente_id: e.target.value })}
                      className={`${luxuryInput} appearance-none cursor-pointer`}
                    >
                      <option value="">Selecione um paciente da lista</option>
                      {pacientes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      ▼
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <label className={luxuryLabel}>Fumante</label>
                    <div className="flex flex-wrap gap-2">
                      {FUMANTE_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setForm({ ...form, metadados: { ...form.metadados, fumante: opt } })}
                          className={`h-10 px-4 rounded-xl text-sm font-bold transition-all ${
                            form.metadados.fumante === opt
                              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25 ring-2 ring-purple-600 ring-offset-2'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={luxuryLabel}>Atividade Física</label>
                    <div className="flex flex-wrap gap-2">
                      {ATIVIDADE_FISICA_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setForm({ ...form, metadados: { ...form.metadados, atividade_fisica: opt } })
                          }
                          className={`h-10 px-4 rounded-xl text-sm font-bold transition-all ${
                            form.metadados.atividade_fisica === opt
                              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25 ring-2 ring-purple-600 ring-offset-2'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className={luxuryLabel}>Histórico Familiar</label>
                  <div className="flex flex-wrap gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {HISTORICO_FAMILIAR_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            metadados: {
                              ...form.metadados,
                              historico_familiar: toggleArrayItem(form.metadados.historico_familiar, opt),
                            },
                          })
                        }
                        className={`h-9 px-4 rounded-lg text-xs font-bold transition-all ${
                          form.metadados.historico_familiar.includes(opt)
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <label className="block text-sm font-bold text-slate-700 mb-4 flex justify-between">
                    <span>Escala Visual Analógica (EVA) de Dor</span>
                    <span className="text-purple-600">{form.metadados.dor_eva}/10</span>
                  </label>
                  
                  <div className="flex items-center gap-6">
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-inner border border-white/50 ${
                      form.metadados.dor_eva === 0 ? 'bg-green-100 text-green-700' :
                      form.metadados.dor_eva <= 3 ? 'bg-yellow-100 text-yellow-700' :
                      form.metadados.dor_eva <= 6 ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {form.metadados.dor_eva}
                    </div>
                    
                    <div className="flex-1">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={form.metadados.dor_eva}
                        onChange={(e) =>
                          setForm({ ...form, metadados: { ...form.metadados, dor_eva: parseInt(e.target.value) } })
                        }
                        className="w-full h-3 rounded-full appearance-none cursor-pointer accent-purple-600"
                        style={{
                          background: `linear-gradient(to right, #10b981 0%, #eab308 33%, #f97316 66%, #ef4444 100%)`,
                        }}
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-medium px-1">
                        <span>Sem dor</span>
                        <span>Dor moderada</span>
                        <span>Dor máxima</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setStep(2)}
                  disabled={!form.paciente_id}
                  className={luxuryButtonPrimary}
                >
                  Continuar para Anamnese
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Anamnese Detalhada */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-2 pb-6 border-b border-slate-100">
                <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Anamnese Detalhada</h2>
                  <p className="text-sm text-slate-500">Detalhamento da queixa e histórico</p>
                </div>
              </div>

              <div className="grid gap-8">
                <div>
                  <label className={luxuryLabel}>Queixa Principal (QP)</label>
                  <textarea
                    value={form.qp}
                    onChange={(e) => setForm({ ...form, qp: e.target.value })}
                    rows={3}
                    className={luxuryTextArea}
                    placeholder="Descreva a queixa principal do paciente..."
                  />
                </div>

                <div>
                  <label className={luxuryLabel}>
                    História da Doença Atual (HDA)
                  </label>
                  <textarea
                    value={form.hda}
                    onChange={(e) => setForm({ ...form, hda: e.target.value })}
                    rows={4}
                    className={luxuryTextArea}
                    placeholder="Histórico da doença atual, início dos sintomas, evolução..."
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className={luxuryLabel}>Localização da Dor</label>
                    <input
                      type="text"
                      value={form.metadados.localizacao_dor}
                      onChange={(e) =>
                        setForm({ ...form, metadados: { ...form.metadados, localizacao_dor: e.target.value } })
                      }
                      className={luxuryInput}
                      placeholder="Ex: Lombar, Cervical..."
                    />
                  </div>

                  <div>
                    <label className={luxuryLabel}>Irradiação</label>
                    <input
                      type="text"
                      value={form.metadados.irradiacao}
                      onChange={(e) =>
                        setForm({ ...form, metadados: { ...form.metadados, irradiacao: e.target.value } })
                      }
                      className={luxuryInput}
                      placeholder="Ex: Membro inferior direito..."
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <label className={luxuryLabel}>Fatores de Melhora</label>
                    <div className="flex flex-wrap gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 min-h-[100px] content-start">
                      {FATORES_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              metadados: {
                                ...form.metadados,
                                fatores_melhora: toggleArrayItem(form.metadados.fatores_melhora, opt),
                              },
                            })
                          }
                          className={`h-8 px-3 rounded-lg text-xs font-bold transition-all ${
                            form.metadados.fatores_melhora.includes(opt)
                              ? 'bg-green-600 text-white shadow-md'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={luxuryLabel}>Fatores de Piora</label>
                    <div className="flex flex-wrap gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 min-h-[100px] content-start">
                      {FATORES_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              metadados: {
                                ...form.metadados,
                                fatores_piora: toggleArrayItem(form.metadados.fatores_piora, opt),
                              },
                            })
                          }
                          className={`h-8 px-3 rounded-lg text-xs font-bold transition-all ${
                            form.metadados.fatores_piora.includes(opt)
                              ? 'bg-red-600 text-white shadow-md'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 pt-4">
                <div className="md:w-1/3">
                  <button
                    onClick={() => setStep(1)}
                    className={luxuryButtonSecondary}
                  >
                    Voltar
                  </button>
                </div>
                <div className="md:w-2/3">
                  <button
                    onClick={() => setStep(3)}
                    className={luxuryButtonPrimary}
                  >
                    Continuar para Exames
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Exames e Diagnóstico */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-2 pb-6 border-b border-slate-100">
                <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Exames e Diagnóstico</h2>
                  <p className="text-sm text-slate-500">Avaliação clínica e plano terapêutico</p>
                </div>
              </div>

              <div className="grid gap-8">
                <div>
                  <label className={luxuryLabel}>Exames Complementares</label>
                  <textarea
                    value={form.exames_complementares}
                    onChange={(e) => setForm({ ...form, exames_complementares: e.target.value })}
                    rows={4}
                    className={luxuryTextArea}
                    placeholder="Laudos médicos, exames de imagem, laboratoriais..."
                  />
                </div>

                <div>
                  <label className={luxuryLabel}>
                    Diagnóstico Fisioterapêutico
                  </label>
                  <textarea
                    value={form.diagnostico_fisio}
                    onChange={(e) => setForm({ ...form, diagnostico_fisio: e.target.value })}
                    rows={4}
                    className={luxuryTextArea}
                    placeholder="Diagnóstico cinético-funcional do paciente..."
                  />
                </div>

                <div>
                  <label className={luxuryLabel}>Conduta e Plano de Tratamento</label>
                  <textarea
                    value={form.conduta}
                    onChange={(e) => setForm({ ...form, conduta: e.target.value })}
                    rows={5}
                    className={luxuryTextArea}
                    placeholder="Objetivos terapêuticos, recursos, frequência, prognóstico..."
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 pt-4">
                <div className="md:w-1/3">
                  <button
                    onClick={() => setStep(2)}
                    className={luxuryButtonSecondary}
                  >
                    Voltar
                  </button>
                </div>
                <div className="md:w-2/3">
                  <button
                    onClick={() => setStep(4)}
                    className={luxuryButtonPrimary}
                  >
                    Continuar para Assinatura
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Assinatura Digital */}
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-2 pb-6 border-b border-slate-100">
                <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Heart className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Assinatura Digital</h2>
                  <p className="text-sm text-slate-500">Validação final do documento</p>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6 flex gap-4 items-start">
                <AlertCircle className="h-6 w-6 text-purple-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-purple-900">Validação Obrigatória</h4>
                  <p className="text-sm text-purple-800/80 leading-relaxed">
                    A assinatura digital é indispensável para a validade legal deste documento conforme normas do CREFITO-MG. Certifique-se de que a assinatura esteja legível.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-1 bg-slate-50/50">
                <SignaturePad
                  onSave={(base64) => setForm({ ...form, assinatura_digital: base64 })}
                  onClear={() => setForm({ ...form, assinatura_digital: '' })}
                  initialSignature={form.assinatura_digital}
                />
              </div>

              <div className="flex flex-col md:flex-row gap-4 pt-4">
                <div className="md:w-1/3">
                  <button
                    onClick={() => setStep(3)}
                    className={luxuryButtonSecondary}
                  >
                    Voltar
                  </button>
                </div>
                <div className="md:w-2/3">
                  <button
                    onClick={() => startTransition(() => handleSubmit())}
                    disabled={saving || isPending || !form.assinatura_digital}
                    className={luxuryButtonPrimary}
                  >
                    {saving || isPending ? (
                      <div className="flex items-center justify-center gap-2">
                        <Cloud className="h-5 w-5 animate-pulse" />
                        <span>Salvando na Nuvem...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Save className="h-5 w-5" />
                        <span>Salvar Avaliação</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
