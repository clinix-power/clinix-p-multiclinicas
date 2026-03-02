'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import ClinixIcon from '@/components/ClinixIcon'
import { Check, X, Sparkles, CreditCard, Calendar, TrendingUp, AlertCircle, ChevronRight } from 'lucide-react'

type Plano = {
  nome: string
  valor_mensal: number
  recursos: Record<string, boolean>
}

type Clinica = {
  id: string
  nome_fantasia: string
  status: string
  assinatura_ativa: boolean
  assinatura_vencimento: string | null
  data_expiracao_trial: string | null
  planos: Plano
}

type Pagamento = {
  id: string
  tipo: string
  valor: number
  status: string
  data_pagamento: string | null
  created_at: string
}

export default function MinhaAssinaturaPage() {
  const [clinica, setClinica] = useState<Clinica | null>(null)
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [loading, setLoading] = useState(true)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelStep, setCancelStep] = useState(1)
  const [cancelMotivo, setCancelMotivo] = useState('')
  const [cancelConfirm, setCancelConfirm] = useState('')
  const clinicaIdRef = useRef<string | null>(null)

  async function load() {
    try {
      const { data: s } = await supabase.auth.getSession()
      const userId = s.session?.user?.id
      if (!userId) return

      const { data: prof } = await supabase
        .from('profiles')
        .select('clinica_id')
        .eq('id', userId)
        .single()
      if (!prof?.clinica_id) return
      clinicaIdRef.current = prof.clinica_id

      const [{ data: clinicaData }, { data: pagamentosData }] = await Promise.all([
        supabase
          .from('clinicas')
          .select('id, nome_fantasia, status, assinatura_ativa, assinatura_vencimento, data_expiracao_trial, planos(id, nome, valor_mensal, recursos)')
          .eq('id', prof.clinica_id)
          .single(),
        supabase
          .from('pagamentos')
          .select('*')
          .eq('clinica_id', prof.clinica_id)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (clinicaData) setClinica(clinicaData as any)
      if (pagamentosData) setPagamentos(pagamentosData as Pagamento[])
    } catch (err) {
      console.error('[minha-assinatura] load error', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function calcularDiasRestantes(): number {
    if (!clinica) return 0
    const dataVenc = clinica.status === 'TRIAL' ? clinica.data_expiracao_trial : clinica.assinatura_vencimento
    if (!dataVenc) return 0
    const diff = new Date(dataVenc).getTime() - new Date().getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  function formatarData(data: string | null): string {
    if (!data) return '—'
    return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  function handleUpgrade() {
    window.open('https://appmax.com.br/checkout/ULTIMATE_PLACEHOLDER', '_blank')
  }

  function handleRenovar() {
    window.open('https://appmax.com.br/checkout/RENOVACAO_PLACEHOLDER', '_blank')
  }

  async function handleCancelar() {
    if (cancelConfirm !== 'CANCELAR') return
    try {
      await supabase.from('clinicas').update({ status: 'CANCELLED' }).eq('id', clinicaIdRef.current!)
      alert('Assinatura cancelada. Você terá acesso até a data de vencimento.')
      setShowCancelModal(false)
      load()
    } catch (err) {
      console.error('[cancelar] error', err)
      alert('Erro ao cancelar. Tente novamente.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
      </div>
    )
  }

  if (!clinica || !clinica.planos) {
    return (
      <div className="p-8 text-center">
        <ClinixIcon size={48} variant="slim" className="mx-auto mb-4 opacity-20" />
        <p className="text-slate-500">Erro ao carregar dados da assinatura.</p>
      </div>
    )
  }

  const plano = clinica?.planos
  const isPro = plano?.nome === 'PRO'
  const isUltimate = plano?.nome === 'ULTIMATE' || plano?.nome === 'TESTE_INTERNO'
  const isTrial = clinica?.status === 'TRIAL'
  const diasRestantes = calcularDiasRestantes()
  const progressoTrial = isTrial && clinica.data_expiracao_trial ? ((30 - diasRestantes) / 30) * 100 : 0

  return (
    <div
      className="min-h-screen p-6 sm:p-8 lg:p-12"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, rgba(243,232,255,0.4) 100%)',
      }}
    >
      {/* Partículas de fundo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-purple-400/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 5}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="max-w-6xl mx-auto relative" style={{ zIndex: 1 }}>
        {/* HERO SECTION — Status da Assinatura */}
        <div
          className="rounded-[28px] p-8 sm:p-10 mb-8"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(168,85,247,0.15)',
            boxShadow: '0 20px 60px rgba(168,85,247,0.12), 0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(168,85,247,0.08)',
                  border: '2px solid rgba(168,85,247,0.15)',
                }}
              >
                <ClinixIcon size={28} variant="slim" />
              </div>
              <div>
                <h1
                  className="text-3xl font-extrabold mb-1"
                  style={{ letterSpacing: '-0.04em', color: 'rgba(18,18,28,0.92)' }}
                >
                  Minha Assinatura
                </h1>
                <p className="text-sm" style={{ color: 'rgba(18,18,28,0.5)' }}>
                  Central de controle do seu plano
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start lg:items-end gap-3">
              {isUltimate && (
                <div
                  className="px-4 py-2 rounded-full text-sm font-bold text-white relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #a855f7)',
                    boxShadow: '0 8px 24px rgba(168,85,247,0.3)',
                  }}
                >
                  <span className="relative z-10">✦ ULTIMATE</span>
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.8), transparent)',
                      animation: 'shimmer 3s ease-in-out infinite',
                    }}
                  />
                </div>
              )}
              {isPro && (
                <div
                  className="px-4 py-2 rounded-full text-sm font-bold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
                    boxShadow: '0 8px 24px rgba(59,130,246,0.3)',
                    border: '1px solid rgba(255,255,255,0.3)',
                  }}
                >
                  PRO
                </div>
              )}
              {isTrial && (
                <div
                  className="px-4 py-2 rounded-full text-sm font-bold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(100,116,139,0.15), rgba(168,85,247,0.15))',
                    border: '1px solid rgba(100,116,139,0.3)',
                    color: 'rgba(18,18,28,0.7)',
                  }}
                >
                  TRIAL
                </div>
              )}
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: clinica.status === 'ACTIVE' || clinica.status === 'TRIAL' ? '#22c55e' : '#ef4444',
                    boxShadow: `0 0 8px ${clinica.status === 'ACTIVE' || clinica.status === 'TRIAL' ? '#22c55e' : '#ef4444'}`,
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />
                <span className="text-xs font-semibold" style={{ color: 'rgba(18,18,28,0.6)' }}>
                  {clinica.status === 'ACTIVE' || clinica.status === 'TRIAL' ? 'ATIVO' : 'INATIVO'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              className="p-5 rounded-2xl"
              style={{
                background: 'rgba(168,85,247,0.05)',
                border: '1px solid rgba(168,85,247,0.1)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4" style={{ color: '#a855f7' }} />
                <p className="text-xs font-semibold" style={{ color: 'rgba(18,18,28,0.5)' }}>
                  Plano Atual
                </p>
              </div>
              <p className="text-2xl font-bold mb-1" style={{ color: 'rgba(18,18,28,0.92)' }}>
                {plano?.nome || '—'}
              </p>
              <p className="text-sm font-semibold" style={{ color: '#a855f7' }}>
                R$ {plano?.valor_mensal?.toFixed(2) || '0,00'}/mês
              </p>
            </div>

            <div
              className="p-5 rounded-2xl"
              style={{
                background: 'rgba(34,197,94,0.05)',
                border: '1px solid rgba(34,197,94,0.1)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4" style={{ color: '#22c55e' }} />
                <p className="text-xs font-semibold" style={{ color: 'rgba(18,18,28,0.5)' }}>
                  Próxima Cobrança
                </p>
              </div>
              <p className="text-lg font-bold" style={{ color: 'rgba(18,18,28,0.92)' }}>
                {formatarData(isTrial ? clinica.data_expiracao_trial : clinica.assinatura_vencimento)}
              </p>
            </div>

            <div
              className="p-5 rounded-2xl relative overflow-hidden"
              style={{
                background: diasRestantes <= 3 ? 'rgba(239,68,68,0.05)' : 'rgba(59,130,246,0.05)',
                border: `1px solid ${diasRestantes <= 3 ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" style={{ color: diasRestantes <= 3 ? '#ef4444' : '#3b82f6' }} />
                <p className="text-xs font-semibold" style={{ color: 'rgba(18,18,28,0.5)' }}>
                  Dias Restantes
                </p>
              </div>
              <p className="text-3xl font-bold mb-2" style={{ color: diasRestantes <= 3 ? '#ef4444' : '#3b82f6' }}>
                {diasRestantes}
              </p>
              <div className="w-full h-2 rounded-full bg-black/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (diasRestantes / 30) * 100)}%`,
                    background: diasRestantes <= 3 ? 'linear-gradient(90deg, #ef4444, #dc2626)' : 'linear-gradient(90deg, #3b82f6, #2563eb)',
                  }}
                />
              </div>
            </div>
          </div>

          {isTrial && (
            <div
              className="mt-6 p-4 rounded-xl"
              style={{
                background: `linear-gradient(90deg, rgba(239,68,68,${progressoTrial / 100}), rgba(249,115,22,${progressoTrial / 200}))`,
                border: '1px solid rgba(239,68,68,0.3)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-white">Período de Teste</p>
                <p className="text-sm font-bold text-white">{progressoTrial.toFixed(0)}% consumido</p>
              </div>
              <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${progressoTrial}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 2 — UPGRADE (apenas para PRO) */}
        {isPro && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6" style={{ letterSpacing: '-0.03em', color: 'rgba(18,18,28,0.92)' }}>
              Desbloqueie todo o potencial
            </h2>
            <div
              className="grid md:grid-cols-2 gap-6 p-8 rounded-[28px]"
              style={{
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(168,85,247,0.15)',
                boxShadow: '0 20px 60px rgba(168,85,247,0.12)',
              }}
            >
              <div className="space-y-4">
                <h3 className="text-lg font-bold mb-4" style={{ color: 'rgba(18,18,28,0.7)' }}>
                  Seu Plano PRO
                </h3>
                {[
                  'Até 5 funcionários',
                  'Evoluções com IA',
                  'Assinatura Digital',
                  'Laudos PDF (Padrão CREFITO)',
                  'Gestão Financeira Completa',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                    <span className="text-sm" style={{ color: 'rgba(18,18,28,0.7)' }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className="relative p-6 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(251,191,36,0.08))',
                  border: '2px solid rgba(168,85,247,0.3)',
                }}
              >
                <div
                  className="absolute -top-3 -right-3 px-3 py-1 rounded-full text-xs font-bold text-white transform rotate-12"
                  style={{ background: 'linear-gradient(135deg, #fbbf24, #a855f7)' }}
                >
                  RECOMENDADO
                </div>
                <h3 className="text-xl font-bold mb-4" style={{ color: '#a855f7' }}>
                  ULTIMATE
                </h3>
                <div className="space-y-3 mb-6">
                  {[
                    '✦ IA Consultora Financeira Clinix',
                    '✦ Alertas de Perda de Pacientes',
                    '✦ Inteligência de Dados Avançada',
                    '✦ Dashboard Nível Banking Completo',
                    '✦ Funcionários ILIMITADOS',
                    '✦ Pacientes ILIMITADOS',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
                      <span className="text-sm font-semibold" style={{ color: 'rgba(18,18,28,0.92)' }}>
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleUpgrade}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #a855f7)',
                    boxShadow: '0 12px 32px rgba(168,85,247,0.4)',
                  }}
                >
                  Fazer Upgrade para ULTIMATE
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SEÇÃO 3 — HISTÓRICO DE PAGAMENTOS */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6" style={{ letterSpacing: '-0.03em', color: 'rgba(18,18,28,0.92)' }}>
            Histórico de Pagamentos
          </h2>
          <div
            className="rounded-[28px] overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(168,85,247,0.15)',
              boxShadow: '0 20px 60px rgba(168,85,247,0.12)',
            }}
          >
            {pagamentos.length === 0 ? (
              <div className="p-12 text-center">
                <ClinixIcon size={48} variant="slim" className="mx-auto mb-4 opacity-20" />
                <p className="text-sm" style={{ color: 'rgba(18,18,28,0.5)' }}>
                  Nenhum pagamento registrado ainda
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-black/5">
                      <th className="px-6 py-4 text-left text-xs font-semibold" style={{ color: 'rgba(18,18,28,0.5)' }}>
                        Data
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold" style={{ color: 'rgba(18,18,28,0.5)' }}>
                        Descrição
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold" style={{ color: 'rgba(18,18,28,0.5)' }}>
                        Valor
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold" style={{ color: 'rgba(18,18,28,0.5)' }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagamentos.map((pag) => (
                      <tr key={pag.id} className="border-b border-black/5 hover:bg-purple-50/30 transition-colors">
                        <td className="px-6 py-4 text-sm" style={{ color: 'rgba(18,18,28,0.7)' }}>
                          {formatarData(pag.data_pagamento || pag.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium" style={{ color: 'rgba(18,18,28,0.92)' }}>
                          {pag.tipo}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-right" style={{ color: 'rgba(18,18,28,0.92)' }}>
                          R$ {pag.valor.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                            style={{
                              background:
                                pag.status === 'APPROVED'
                                  ? 'rgba(34,197,94,0.1)'
                                  : pag.status === 'PENDING'
                                  ? 'rgba(234,179,8,0.1)'
                                  : 'rgba(239,68,68,0.1)',
                              color:
                                pag.status === 'APPROVED' ? '#22c55e' : pag.status === 'PENDING' ? '#eab308' : '#ef4444',
                              border: `1px solid ${
                                pag.status === 'APPROVED' ? '#22c55e40' : pag.status === 'PENDING' ? '#eab30840' : '#ef444440'
                              }`,
                            }}
                          >
                            {pag.status === 'APPROVED' ? 'APROVADO' : pag.status === 'PENDING' ? 'PENDENTE' : 'CANCELADO'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* SEÇÃO 4 — CANCELAMENTO */}
        <div className="text-center">
          <button
            onClick={() => setShowCancelModal(true)}
            className="text-xs transition-colors hover:text-slate-700"
            style={{ color: 'rgba(18,18,28,0.4)' }}
          >
            Cancelar assinatura
          </button>
        </div>
      </div>

      {/* MODAL DE CANCELAMENTO */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="max-w-lg w-full rounded-2xl p-8"
            style={{
              background: 'white',
              boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {cancelStep === 1 && (
              <>
                <h3 className="text-2xl font-bold mb-4" style={{ color: 'rgba(18,18,28,0.92)' }}>
                  Que pena! Antes de ir, nos conte o motivo:
                </h3>
                <div className="space-y-3 mb-6">
                  {[
                    { id: 'caro', label: '💰 Está caro para mim' },
                    { id: 'pouco-uso', label: '📱 Não estou usando muito' },
                    { id: 'outro-sistema', label: '🔄 Vou usar outro sistema' },
                    { id: 'pausar', label: '⏸️ Vou pausar minha clínica' },
                    { id: 'outro', label: '🤔 Outro motivo' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setCancelMotivo(opt.id)}
                      className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.02]"
                      style={{
                        background: cancelMotivo === opt.id ? 'rgba(168,85,247,0.1)' : 'rgba(0,0,0,0.02)',
                        border: `2px solid ${cancelMotivo === opt.id ? '#a855f7' : 'transparent'}`,
                      }}
                    >
                      <span className="text-sm font-semibold" style={{ color: 'rgba(18,18,28,0.92)' }}>
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCancelStep(2)}
                  disabled={!cancelMotivo}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #a855f7, #9333ea)' }}
                >
                  Continuar
                </button>
              </>
            )}

            {cancelStep === 2 && (
              <>
                {cancelMotivo === 'caro' && (
                  <div
                    className="p-6 rounded-2xl mb-6"
                    style={{
                      background: 'rgba(34,197,94,0.1)',
                      border: '2px solid rgba(34,197,94,0.3)',
                    }}
                  >
                    <h3 className="text-xl font-bold mb-3" style={{ color: '#22c55e' }}>
                      🎁 Oferta especial para você!
                    </h3>
                    <p className="text-sm mb-4" style={{ color: 'rgba(18,18,28,0.7)' }}>
                      30% de desconto nos próximos 3 meses
                    </p>
                    <button
                      onClick={() => {
                        alert('Desconto aplicado! Sua assinatura foi atualizada.')
                        setShowCancelModal(false)
                      }}
                      className="w-full py-3 rounded-xl text-sm font-bold text-white mb-2"
                      style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                    >
                      Aceitar oferta
                    </button>
                  </div>
                )}
                {cancelMotivo === 'pouco-uso' && (
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-4" style={{ color: 'rgba(18,18,28,0.92)' }}>
                      Você sabia que pode fazer isso?
                    </h3>
                    <div className="space-y-3 mb-4">
                      <a
                        href="/evolucoes"
                        className="block p-4 rounded-xl hover:bg-purple-50 transition-colors"
                        style={{ border: '1px solid rgba(168,85,247,0.2)' }}
                      >
                        <p className="text-sm font-semibold" style={{ color: '#a855f7' }}>
                          IA para Evoluções →
                        </p>
                      </a>
                      <a
                        href="/admin/financeiro"
                        className="block p-4 rounded-xl hover:bg-purple-50 transition-colors"
                        style={{ border: '1px solid rgba(168,85,247,0.2)' }}
                      >
                        <p className="text-sm font-semibold" style={{ color: '#a855f7' }}>
                          Dashboard Financeiro →
                        </p>
                      </a>
                    </div>
                  </div>
                )}
                {cancelMotivo === 'pausar' && (
                  <div
                    className="p-6 rounded-2xl mb-6"
                    style={{
                      background: 'rgba(59,130,246,0.1)',
                      border: '2px solid rgba(59,130,246,0.3)',
                    }}
                  >
                    <h3 className="text-xl font-bold mb-3" style={{ color: '#3b82f6' }}>
                      ⏸️ Pause por 30 dias sem custo
                    </h3>
                    <button
                      onClick={() => {
                        alert('Assinatura pausada por 30 dias.')
                        setShowCancelModal(false)
                      }}
                      className="w-full py-3 rounded-xl text-sm font-bold text-white mb-2"
                      style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                    >
                      Pausar assinatura
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setCancelStep(3)}
                  className="text-sm transition-colors hover:text-slate-700"
                  style={{ color: 'rgba(18,18,28,0.5)' }}
                >
                  Continuar cancelando
                </button>
              </>
            )}

            {cancelStep === 3 && (
              <>
                <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#ef4444' }} />
                <h3 className="text-2xl font-bold mb-4 text-center" style={{ color: 'rgba(18,18,28,0.92)' }}>
                  Confirmação final
                </h3>
                <div className="mb-6 space-y-2 text-sm" style={{ color: 'rgba(18,18,28,0.7)' }}>
                  <p>• Sua clínica terá acesso até {formatarData(clinica.assinatura_vencimento)}</p>
                  <p>• Seus dados ficam salvos por 90 dias</p>
                </div>
                <input
                  type="text"
                  placeholder="Digite CANCELAR para confirmar"
                  value={cancelConfirm}
                  onChange={(e) => setCancelConfirm(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl mb-4 border-2 focus:outline-none focus:border-red-500"
                  style={{ borderColor: 'rgba(0,0,0,0.1)' }}
                />
                <button
                  onClick={handleCancelar}
                  disabled={cancelConfirm !== 'CANCELAR'}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                >
                  Confirmar cancelamento
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes pulse-glow {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4);
          }
          50% {
            box-shadow: 0 0 0 12px rgba(168, 85, 247, 0);
          }
        }
        @keyframes shimmer {
          0%,
          100% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(-20px) translateX(10px);
          }
        }
      `}</style>
    </div>
  )
}
