'use client'

import { useState } from 'react'
import { TrendingUp, Users, Calendar, DollarSign, AlertCircle, X, Check, ChevronRight, ChevronLeft } from 'lucide-react'
import SignaturePad from './SignatureCanvas'

export default function DashboardDemo() {
  const [showToast, setShowToast] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [showSuccess, setShowSuccess] = useState(false)
  
  // Form state
  const [pacienteSelecionado, setPacienteSelecionado] = useState('Maria Silva')
  const [fumante, setFumante] = useState('Não')
  const [atividadeFisica, setAtividadeFisica] = useState('Moderado')
  const [historicoFamiliar, setHistoricoFamiliar] = useState<string[]>(['Diabetes'])
  const [evaDor, setEvaDor] = useState(5)
  const [queixaPrincipal, setQueixaPrincipal] = useState('')
  const [hda, setHda] = useState('')
  const [localizacaoDor, setLocalizacaoDor] = useState('')
  const [irradiacao, setIrradiacao] = useState('')
  const [fatoresMelhora, setFatoresMelhora] = useState<string[]>(['Repouso'])
  const [fatoresPiora, setFatoresPiora] = useState<string[]>(['Movimento'])
  const [exames, setExames] = useState('')
  const [diagnostico, setDiagnostico] = useState('')
  const [conduta, setConduta] = useState('')
  const [assinatura, setAssinatura] = useState('')

  const handleBlockedAction = () => {
    setShowToast(true)
    setTimeout(() => setShowToast(false), 4000)
  }

  const pacientes = ['Maria Silva', 'João Santos', 'Ana Costa', 'Carlos Mendes']
  const historicoOptions = ['Diabetes', 'Hipertensão', 'Cardiopatia', 'AVC', 'Câncer', 'Nenhum']
  const fatoresOptions = ['Repouso', 'Movimento', 'Esforço físico', 'Frio', 'Calor', 'Estresse', 'Postura']

  const toggleMultiSelect = (value: string, current: string[], setter: (val: string[]) => void) => {
    if (current.includes(value)) {
      setter(current.filter(v => v !== value))
    } else {
      setter([...current, value])
    }
  }

  const getEvaColor = (value: number) => {
    if (value <= 3) return '#22c55e'
    if (value <= 6) return '#eab308'
    if (value <= 8) return '#f97316'
    return '#ef4444'
  }

  const handleConcluir = () => {
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      setCurrentStep(1)
      // Reset form
      setQueixaPrincipal('')
      setHda('')
      setLocalizacaoDor('')
      setIrradiacao('')
      setExames('')
      setDiagnostico('')
      setConduta('')
      setAssinatura('')
    }, 3000)
  }

  const progress = (currentStep / 4) * 100

  return (
    <div className="relative">
      {/* Toast de Bloqueio */}
      {showToast && (
        <div className="fixed top-20 right-4 z-50 cp-card p-4 max-w-sm shadow-lg" style={{ border: '2px solid #a855f7' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(168,85,247,0.1)' }}>
              <AlertCircle className="w-5 h-5" style={{ color: '#a855f7' }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold mb-1" style={{ color: 'rgba(18,18,28,.92)', fontSize: '.95rem' }}>
                Este é o Modo Demo
              </p>
              <p className="text-sm" style={{ color: 'rgba(18,18,28,.50)' }}>
                Ative seu Clinix Power por R$ 19,90 para liberar estas funções.
              </p>
            </div>
            <button onClick={() => setShowToast(false)} className="flex-shrink-0">
              <X className="w-4 h-4" style={{ color: 'rgba(18,18,28,.50)' }} />
            </button>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-20 right-4 z-50 cp-card p-4 max-w-sm shadow-lg" style={{ border: '2px solid #22c55e' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <Check className="w-5 h-5" style={{ color: '#22c55e' }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold mb-1" style={{ color: 'rgba(18,18,28,.92)', fontSize: '.95rem' }}>
                Avaliação Concluída!
              </p>
              <p className="text-sm" style={{ color: 'rgba(18,18,28,.50)' }}>
                Dados fictícios — nenhum dado foi salvo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Demo */}
      <div className="space-y-6">
        {/* Badge Modo Demo */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#a855f7' }} />
          MODO DEMONSTRAÇÃO
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="cp-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(18,18,28,.50)' }}>Pacientes</span>
              <Users className="w-5 h-5" style={{ color: '#a855f7' }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: 'rgba(18,18,28,.92)' }}>127</div>
            <p className="text-xs mt-1" style={{ color: '#22c55e' }}>+12 este mês</p>
          </div>

          <div className="cp-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(18,18,28,.50)' }}>Atendimentos</span>
              <Calendar className="w-5 h-5" style={{ color: '#a855f7' }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: 'rgba(18,18,28,.92)' }}>342</div>
            <p className="text-xs mt-1" style={{ color: '#22c55e' }}>+28 esta semana</p>
          </div>

          <div className="cp-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(18,18,28,.50)' }}>Faturamento</span>
              <DollarSign className="w-5 h-5" style={{ color: '#a855f7' }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: 'rgba(18,18,28,.92)' }}>R$ 48,5k</div>
            <p className="text-xs mt-1" style={{ color: '#22c55e' }}>+18% vs mês anterior</p>
          </div>

          <div className="cp-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(18,18,28,.50)' }}>Taxa de Retorno</span>
              <TrendingUp className="w-5 h-5" style={{ color: '#a855f7' }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: 'rgba(18,18,28,.92)' }}>87%</div>
            <p className="text-xs mt-1" style={{ color: '#22c55e' }}>Excelente!</p>
          </div>
        </div>

        {/* Avaliação Admissional - Modo Funcionário */}
        <div className="cp-card p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold" style={{ fontSize: '1.1rem', color: 'rgba(18,18,28,.92)' }}>
                Avaliação Admissional — Modo Funcionário
              </h3>
              <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                Dados fictícios
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                        step === currentStep ? 'text-white' : step < currentStep ? 'text-white' : 'text-slate-400'
                      }`}
                      style={{ 
                        background: step <= currentStep ? '#a855f7' : 'rgba(0,0,0,0.05)'
                      }}
                    >
                      {step < currentStep ? <Check className="w-4 h-4" /> : step}
                    </div>
                    {step < 4 && (
                      <div 
                        className="w-12 md:w-20 h-1 mx-2"
                        style={{ background: step < currentStep ? '#a855f7' : 'rgba(0,0,0,0.05)' }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="w-full h-2 rounded-full" style={{ background: 'rgba(0,0,0,0.05)' }}>
                <div 
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, background: '#a855f7' }}
                />
              </div>
              <p className="text-xs mt-2 text-center" style={{ color: 'rgba(18,18,28,.50)' }}>
                Etapa {currentStep} de 4 — {progress.toFixed(0)}% concluído
              </p>
            </div>
          </div>

          {/* STEP 1 - Dados do Paciente */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(18,18,28,.92)' }}>
                  Paciente
                </label>
                <select 
                  value={pacienteSelecionado}
                  onChange={(e) => setPacienteSelecionado(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border text-sm"
                  style={{ borderColor: 'rgba(0,0,0,0.12)' }}
                >
                  {pacientes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(18,18,28,.92)' }}>
                  Fumante
                </label>
                <div className="flex gap-2">
                  {['Não', 'Sim', 'Ex-fumante'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFumante(opt)}
                      className="px-4 py-2 rounded-full text-sm font-medium transition"
                      style={{
                        background: fumante === opt ? '#a855f7' : 'rgba(0,0,0,0.05)',
                        color: fumante === opt ? 'white' : 'rgba(18,18,28,.50)'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(18,18,28,.92)' }}>
                  Atividade Física
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Sedentário', 'Leve', 'Moderado', 'Intenso'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setAtividadeFisica(opt)}
                      className="px-4 py-2 rounded-full text-sm font-medium transition"
                      style={{
                        background: atividadeFisica === opt ? '#a855f7' : 'rgba(0,0,0,0.05)',
                        color: atividadeFisica === opt ? 'white' : 'rgba(18,18,28,.50)'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(18,18,28,.92)' }}>
                  Histórico Familiar (múltipla escolha)
                </label>
                <div className="flex flex-wrap gap-2">
                  {historicoOptions.map(opt => (
                    <button
                      key={opt}
                      onClick={() => toggleMultiSelect(opt, historicoFamiliar, setHistoricoFamiliar)}
                      className="px-4 py-2 rounded-full text-sm font-medium transition"
                      style={{
                        background: historicoFamiliar.includes(opt) ? '#a855f7' : 'rgba(0,0,0,0.05)',
                        color: historicoFamiliar.includes(opt) ? 'white' : 'rgba(18,18,28,.50)'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(18,18,28,.92)' }}>
                  Escala EVA de Dor: {evaDor}
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={evaDor}
                  onChange={(e) => setEvaDor(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: getEvaColor(evaDor) }}
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: 'rgba(18,18,28,.50)' }}>
                  <span>0 - Sem dor</span>
                  <span style={{ color: getEvaColor(evaDor), fontWeight: 'bold' }}>{evaDor}</span>
                  <span>10 - Dor máxima</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 - Anamnese */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(18,18,28,.92)' }}>
                  Queixa Principal (QP)
                </label>
                <textarea
                  value={queixaPrincipal}
                  onChange={(e) => setQueixaPrincipal(e.target.value)}
                  placeholder="Descreva a queixa principal do paciente..."
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ borderColor: 'rgba(0,0,0,0.12)', minHeight: '80px' }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(18,18,28,.92)' }}>
                  História da Doença Atual (HDA)
                </label>
                <textarea
                  value={hda}
                  onChange={(e) => setHda(e.target.value)}
                  placeholder="Descreva o histórico da doença..."
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ borderColor: 'rgba(0,0,0,0.12)', minHeight: '80px' }}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(18,18,28,.92)' }}>
                    Localização da Dor
                  </label>
                  <input
                    type="text"
                    value={localizacaoDor}
                    onChange={(e) => setLocalizacaoDor(e.target.value)}
                    placeholder="Ex: Lombar, Cervical..."
                    className="w-full px-4 py-2 rounded-xl border text-sm"
                    style={{ borderColor: 'rgba(0,0,0,0.12)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(18,18,28,.92)' }}>
                    Irradiação
                  </label>
                  <input
                    type="text"
                    value={irradiacao}
                    onChange={(e) => setIrradiacao(e.target.value)}
                    placeholder="Ex: Membro inferior direito..."
                    className="w-full px-4 py-2 rounded-xl border text-sm"
                    style={{ borderColor: 'rgba(0,0,0,0.12)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(18,18,28,.92)' }}>
                  Fatores de Melhora
                </label>
                <div className="flex flex-wrap gap-2">
                  {fatoresOptions.map(opt => (
                    <button
                      key={opt}
                      onClick={() => toggleMultiSelect(opt, fatoresMelhora, setFatoresMelhora)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition"
                      style={{
                        background: fatoresMelhora.includes(opt) ? '#22c55e' : 'rgba(0,0,0,0.05)',
                        color: fatoresMelhora.includes(opt) ? 'white' : 'rgba(18,18,28,.50)'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(18,18,28,.92)' }}>
                  Fatores de Piora
                </label>
                <div className="flex flex-wrap gap-2">
                  {fatoresOptions.map(opt => (
                    <button
                      key={opt}
                      onClick={() => toggleMultiSelect(opt, fatoresPiora, setFatoresPiora)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition"
                      style={{
                        background: fatoresPiora.includes(opt) ? '#ef4444' : 'rgba(0,0,0,0.05)',
                        color: fatoresPiora.includes(opt) ? 'white' : 'rgba(18,18,28,.50)'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 - Exames e Diagnóstico */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(18,18,28,.92)' }}>
                  Exames Complementares
                </label>
                <textarea
                  value={exames}
                  onChange={(e) => setExames(e.target.value)}
                  placeholder="Descreva exames realizados (RX, RM, etc)..."
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ borderColor: 'rgba(0,0,0,0.12)', minHeight: '100px' }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(18,18,28,.92)' }}>
                  Diagnóstico Fisioterapêutico
                </label>
                <textarea
                  value={diagnostico}
                  onChange={(e) => setDiagnostico(e.target.value)}
                  placeholder="Diagnóstico clínico funcional..."
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ borderColor: 'rgba(0,0,0,0.12)', minHeight: '100px' }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(18,18,28,.92)' }}>
                  Conduta e Plano de Tratamento
                </label>
                <textarea
                  value={conduta}
                  onChange={(e) => setConduta(e.target.value)}
                  placeholder="Objetivos, recursos terapêuticos, frequência..."
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ borderColor: 'rgba(0,0,0,0.12)', minHeight: '100px' }}
                />
              </div>
            </div>
          )}

          {/* STEP 4 - Assinatura Digital */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <p className="text-sm font-semibold" style={{ color: '#22c55e' }}>
                  ✓ Dados fictícios — nenhum dado será salvo
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(18,18,28,.92)' }}>
                  Assinatura Digital
                </label>
                <SignaturePad
                  onSave={(base64) => setAssinatura(base64)}
                  onClear={() => setAssinatura('')}
                  disabled={false}
                />
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <p className="text-xs" style={{ color: 'rgba(18,18,28,.50)' }}>
                  <strong>Resumo da Avaliação:</strong><br />
                  Paciente: {pacienteSelecionado} | EVA: {evaDor}/10 | Fumante: {fumante} | Atividade: {atividadeFisica}
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6 pt-6" style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-30"
              style={{ color: '#a855f7' }}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>

            {currentStep < 4 ? (
              <button
                onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
                className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white transition"
                style={{ background: '#a855f7' }}
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleConcluir}
                className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white transition"
                style={{ background: '#22c55e' }}
              >
                <Check className="w-4 h-4" />
                Concluir Avaliação (Demo)
              </button>
            )}
          </div>
        </div>

        {/* CTA Final */}
        <div className="cp-card p-6 text-center" style={{ border: '2px solid #a855f7', background: 'rgba(168,85,247,0.02)' }}>
          <h3 className="font-bold mb-2" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
            Gostou do que viu?
          </h3>
          <p className="mb-4" style={{ color: 'rgba(18,18,28,.50)' }}>
            Ative agora e tenha acesso completo a todas as funcionalidades
          </p>
          <a
            href="/cadastro-clinica"
            className="cp-btn-primary px-8 py-3 text-base font-semibold text-white inline-block"
          >
            Ativar por R$ 19,90
          </a>
        </div>
      </div>
    </div>
  )
}
