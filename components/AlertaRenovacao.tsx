'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { X, AlertTriangle, Clock, Zap } from 'lucide-react'

type Alerta = {
  id: string
  tipo: 'RENOVACAO' | 'TRIAL' | 'UPGRADE'
  dias_restantes: number
  lido: boolean
  created_at: string
}

export default function AlertaRenovacao() {
  const [visible, setVisible] = useState(false)
  const [open, setOpen] = useState(false)
  const [alerta, setAlerta] = useState<Alerta | null>(null)
  const [loading, setLoading] = useState(false)
  const clinicaIdRef = useRef<string | null>(null)

  async function init() {
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

      await loadAlerta(prof.clinica_id)
    } catch (e) {
      console.error('[AlertaRenovacao] init error', e)
    }
  }

  async function loadAlerta(clinicaId: string) {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('alertas_renovacao')
        .select('*')
        .eq('clinica_id', clinicaId)
        .eq('lido', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setAlerta(data as Alerta)
        setVisible(true)
        setTimeout(() => setOpen(true), 3000)
      }
    } catch (err) {
      // Sem alerta pendente
    } finally {
      setLoading(false)
    }
  }

  async function marcarLido() {
    if (!alerta) return
    await supabase.from('alertas_renovacao').update({ lido: true }).eq('id', alerta.id)
    setOpen(false)
    setTimeout(() => setVisible(false), 300)
  }

  async function renovar() {
    // Placeholder - será substituído pela integração Appmax
    window.open('https://appmax.com.br/checkout/RENOVACAO_PLACEHOLDER', '_blank')
    marcarLido()
  }

  useEffect(() => {
    init()
  }, [])

  if (!visible || !alerta) return null

  const urgencia = alerta.dias_restantes <= 1 ? 'critica' : alerta.dias_restantes <= 3 ? 'alta' : 'media'
  const isTrial = alerta.tipo === 'TRIAL'

  const config = {
    critica: {
      bg: 'rgba(239, 68, 68, 0.10)',
      border: '#ef4444',
      icon: AlertTriangle,
      iconColor: '#ef4444',
      pulse: 'animate-pulse',
      titulo: isTrial ? '🚨 Seu teste termina HOJE!' : '🚨 Sua assinatura vence HOJE!',
      mensagem: isTrial
        ? 'Ative agora por R$ 19,90 para não perder seus dados e continuar usando o Clinix Power.'
        : 'Renove agora para não perder o acesso e manter todos os seus dados seguros.',
      ctaText: isTrial ? 'Ativar por R$ 19,90' : 'Renovar agora',
      ctaBg: 'linear-gradient(135deg, #ef4444, #dc2626)',
    },
    alta: {
      bg: 'rgba(249, 115, 22, 0.10)',
      border: '#f97316',
      icon: Clock,
      iconColor: '#f97316',
      pulse: 'animate-pulse',
      titulo: `⚠️ ${isTrial ? 'Seu teste' : 'Sua assinatura'} vence em ${alerta.dias_restantes} dias!`,
      mensagem: isTrial
        ? 'Ative agora por R$ 19,90 e continue aproveitando todos os recursos.'
        : 'Renove agora para não perder o acesso.',
      ctaText: isTrial ? 'Ativar por R$ 19,90' : 'Renovar agora',
      ctaBg: 'linear-gradient(135deg, #f97316, #ea580c)',
    },
    media: {
      bg: 'rgba(168, 85, 247, 0.10)',
      border: '#a855f7',
      icon: Zap,
      iconColor: '#a855f7',
      pulse: '',
      titulo: `${isTrial ? 'Seu teste' : 'Sua assinatura'} vence em ${alerta.dias_restantes} dias`,
      mensagem: isTrial
        ? 'Ative agora por R$ 19,90 para continuar sem interrupções 💜'
        : 'Renove para continuar sem interrupções 💜',
      ctaText: isTrial ? 'Ativar por R$ 19,90' : 'Renovar agora',
      ctaBg: 'linear-gradient(135deg, #a855f7, #9333ea)',
    },
  }

  const cfg = config[urgencia]
  const Icon = cfg.icon

  return (
    <>
      {open && (
        <div
          className="fixed bottom-6 left-6 z-50 w-[340px] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300"
          style={{
            background: cfg.bg,
            border: `2px solid ${cfg.border}`,
            backdropFilter: 'blur(20px)',
            boxShadow: `0 32px 80px rgba(0,0,0,0.2), 0 8px 32px ${cfg.border}40, inset 0 1px 0 rgba(255,255,255,0.1)`,
            animation: 'slideInLeft 0.4s ease-out',
          }}
        >
          <div className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.pulse}`}
                style={{
                  background: `${cfg.iconColor}20`,
                  border: `1px solid ${cfg.iconColor}40`,
                }}
              >
                <Icon className="w-5 h-5" style={{ color: cfg.iconColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold mb-1" style={{ color: 'rgba(18,18,28,0.92)' }}>
                  {cfg.titulo}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(18,18,28,0.65)' }}>
                  {cfg.mensagem}
                </p>
              </div>
              {urgencia !== 'critica' && (
                <button
                  onClick={marcarLido}
                  className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-black/5"
                  style={{ color: 'rgba(18,18,28,0.4)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={renovar}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95"
                style={{
                  background: cfg.ctaBg,
                  boxShadow: `0 8px 24px ${cfg.border}40`,
                }}
              >
                {cfg.ctaText}
              </button>
              {urgencia === 'critica' && (
                <button
                  onClick={marcarLido}
                  className="px-3 py-2.5 rounded-xl text-xs font-semibold transition-all hover:bg-black/5"
                  style={{ color: 'rgba(18,18,28,0.5)' }}
                >
                  Depois
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  )
}
