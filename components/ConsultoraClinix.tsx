'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Insight = {
  id: string
  titulo: string
  descricao: string
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA'
  tipo: 'FINANCEIRO' | 'OPERACIONAL' | 'ESTRATEGICO'
  lido: boolean
  created_at: string
}

const PRIORIDADE_COLOR = {
  ALTA: { dot: '#f43f5e', badge: 'bg-rose-100 text-rose-700 border-rose-200' },
  MEDIA: { dot: '#f59e0b', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  BAIXA: { dot: '#22c55e', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
}

const TIPO_EMOJI = {
  FINANCEIRO: '💰',
  OPERACIONAL: '⚙️',
  ESTRATEGICO: '🚀',
}

export default function ConsultoraClinix() {
  const [visible, setVisible] = useState(false)
  const [open, setOpen] = useState(false)
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const clinicaIdRef = useRef<string | null>(null)
  const sessionTokenRef = useRef<string | null>(null)

  async function init() {
    try {
      const { data: s } = await supabase.auth.getSession()
      const userId = s.session?.user?.id
      const token = s.session?.access_token
      if (!userId || !token) return

      sessionTokenRef.current = token

      const { data: prof } = await supabase
        .from('profiles')
        .select('clinica_id')
        .eq('id', userId)
        .single()
      if (!prof?.clinica_id) return
      clinicaIdRef.current = prof.clinica_id

      // Verifica plano
      const { data: clinicaData } = await supabase
        .from('clinicas')
        .select('planos(recursos)')
        .eq('id', prof.clinica_id)
        .single()
      const recursos = (clinicaData as any)?.planos?.recursos || {}
      if (!recursos.ia_consultora) return

      setVisible(true)
      await loadInsights(prof.clinica_id)
    } catch (e) {
      console.error('[ConsultoraClinix] init error', e)
    }
  }

  async function loadInsights(clinicaId: string) {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('consultora_insights')
        .select('*')
        .eq('clinica_id', clinicaId)
        .order('created_at', { ascending: false })
        .limit(5)
      const list = (data || []) as Insight[]
      setInsights(list)
      setUnreadCount(list.filter(i => !i.lido).length)
    } finally {
      setLoading(false)
    }
  }

  async function marcarLido(id: string) {
    await supabase.from('consultora_insights').update({ lido: true }).eq('id', id)
    setInsights(prev => prev.map(i => i.id === id ? { ...i, lido: true } : i))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  async function marcarTodosLidos() {
    if (!clinicaIdRef.current) return
    await supabase
      .from('consultora_insights')
      .update({ lido: true })
      .eq('clinica_id', clinicaIdRef.current)
      .eq('lido', false)
    setInsights(prev => prev.map(i => ({ ...i, lido: true })))
    setUnreadCount(0)
  }

  async function gerarNovosInsights() {
    if (!sessionTokenRef.current || generating) return
    setGenerating(true)
    try {
      const res = await fetch('/api/consultora/gerar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionTokenRef.current}`,
        },
      })
      if (res.ok && clinicaIdRef.current) {
        await loadInsights(clinicaIdRef.current)
      }
    } catch (e) {
      console.error('[ConsultoraClinix] gerar error', e)
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => { init() }, [])

  if (!visible) return null

  return (
    <>
      {/* FLOATING BUBBLE */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)',
          boxShadow: '0 8px 32px rgba(168,85,247,0.45), 0 2px 8px rgba(0,0,0,0.15)',
        }}
        title="Consultora IA Clinix"
      >
        <span className="text-2xl select-none" aria-hidden>🤖</span>

        {/* Badge não lidos */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg border-2 border-white"
            style={{ animation: 'pulse 2s infinite' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* PAINEL */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 rounded-2xl overflow-hidden shadow-2xl border border-white/20"
          style={{
            background: 'linear-gradient(135deg, rgba(15,10,30,0.97) 0%, rgba(30,15,60,0.97) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 32px 80px rgba(168,85,247,0.3), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          {/* HEADER */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
              >
                🤖
              </div>
              <div>
                <p className="text-sm font-bold text-white">Consultora Clinix</p>
                <p className="text-[10px] text-purple-300">IA Estratégica • ULTIMATE</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={marcarTodosLidos}
                  className="text-[10px] text-purple-300 hover:text-purple-100 font-semibold transition-colors"
                >
                  Marcar tudo
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
                <p className="text-xs text-purple-300">Buscando insights...</p>
              </div>
            ) : insights.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-3xl mb-3">✨</p>
                <p className="text-sm font-semibold text-white/80 mb-1">Nenhum insight ainda</p>
                <p className="text-xs text-purple-300/70 mb-5">Gere agora para receber análises estratégicas personalizadas da sua clínica.</p>
                <button
                  onClick={gerarNovosInsights}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
                >
                  {generating ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>✨ Gerar insights agora</>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-3 space-y-2.5">
                {insights.map(insight => {
                  const colors = PRIORIDADE_COLOR[insight.prioridade] || PRIORIDADE_COLOR.MEDIA
                  const emoji = TIPO_EMOJI[insight.tipo] || '💡'
                  return (
                    <div
                      key={insight.id}
                      className={`rounded-xl p-4 border transition-all cursor-pointer ${
                        insight.lido
                          ? 'border-white/5 bg-white/5'
                          : 'border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/15'
                      }`}
                      onClick={() => { if (!insight.lido) marcarLido(insight.id) }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg flex-shrink-0 mt-0.5">{emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            {!insight.lido && (
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: colors.dot }}
                              />
                            )}
                            <p className={`text-xs font-bold leading-tight ${insight.lido ? 'text-white/60' : 'text-white'}`}>
                              {insight.titulo}
                            </p>
                          </div>
                          <p className={`text-[11px] leading-relaxed ${insight.lido ? 'text-white/40' : 'text-white/70'}`}>
                            {insight.descricao}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${colors.badge}`}>
                              {insight.prioridade}
                            </span>
                            <span className="text-[9px] text-white/30">
                              {new Date(insight.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="px-5 py-3.5 border-t border-white/10 flex items-center justify-end">
            <button
              onClick={gerarNovosInsights}
              disabled={generating}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-300 hover:text-purple-100 transition-colors disabled:opacity-50"
            >
              {generating ? (
                <>
                  <div className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-300 rounded-full animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Atualizar
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
