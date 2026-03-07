'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

// ─── Tipos ───────────────────────────────────────────────────────────────────
type Insight = {
  id: string
  titulo: string
  descricao: string
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA'
  tipo: 'FINANCEIRO' | 'OPERACIONAL' | 'ESTRATEGICO'
  lido: boolean
  created_at: string
}

type RobotMood = 'idle' | 'thinking' | 'creating' | 'excited' | 'sleeping' | 'waking' | 'nodding' | 'waving' | 'surprised'

const PRIORIDADE = {
  ALTA:  { color: '#f43f5e', bg: 'rgba(244,63,94,0.08)',  border: 'rgba(244,63,94,0.2)',  text: '#e11d48', label: 'Alta prioridade'  },
  MEDIA: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#d97706', label: 'Média prioridade' },
  BAIXA: { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', text: '#059669', label: 'Baixa prioridade' },
}

const TIPO_CONFIG: Record<string, { emoji: string; label: string }> = {
  FINANCEIRO:  { emoji: '💰', label: 'Financeiro'  },
  OPERACIONAL: { emoji: '⚙️', label: 'Operacional' },
  ESTRATEGICO: { emoji: '🚀', label: 'Estratégico' },
}

const DAILY_MESSAGES = [
  { text: 'Bom dia! Vamos crescer hoje? 🚀',                     mood: 'excited'  as RobotMood },
  { text: 'Analisei seus dados. Há oportunidades esperando! 💡', mood: 'nodding'  as RobotMood },
  { text: 'Lembre-se de se hidratar! 💧',                        mood: 'waving'   as RobotMood },
  { text: 'Sua clínica está evoluindo. Continue assim! 🌟',      mood: 'excited'  as RobotMood },
  { text: 'Quer ver os insights de hoje? 📊',                    mood: 'nodding'  as RobotMood },
  { text: 'Tarde produtiva! Confira o financeiro. 💰',           mood: 'thinking' as RobotMood },
  { text: 'Quase fim de dia! Revisar agendamentos? 📅',          mood: 'waving'   as RobotMood },
]

// ─── Ícone Raio — header (BRANCO) ────────────────────────────────────────────
function IconeRaio() {
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{
        background: 'linear-gradient(135deg, #4c1d95, #7c3aed)',
        boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Raio BRANCO */}
        <path
          d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"
          fill="white"
          opacity="0.95"
        />
        {/* Brilho sutil */}
        <path
          d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="0.4"
        />
      </svg>
    </div>
  )
}

// ─── Constelação — estado vazio com piscar aleatório ─────────────────────────
function ConstellationEmpty() {
  const [litNode, setLitNode] = useState<number>(1)

  // Piscar nós aleatoriamente — independente do robô
  useEffect(() => {
    const interval = setInterval(() => {
      // Escolhe um nó aleatório entre 0-5 (excluindo o central = 6)
      setLitNode(Math.floor(Math.random() * 6))
    }, 800 + Math.random() * 1200)
    return () => clearInterval(interval)
  }, [])

  const nodes = [
    { cx: 30,  cy: 30,  r: 5   },
    { cx: 70,  cy: 20,  r: 7   },
    { cx: 110, cy: 40,  r: 4   },
    { cx: 100, cy: 80,  r: 6   },
    { cx: 60,  cy: 95,  r: 4.5 },
    { cx: 25,  cy: 75,  r: 5   },
  ]

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="relative mb-6" style={{ width: 140, height: 120 }}>
        <svg width="140" height="120" viewBox="0 0 140 120" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="star-glow-c" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="1" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </radialGradient>
            <filter id="node-glow-c">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="node-glow-lit">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Linhas de conexão */}
          <g stroke="rgba(124,58,237,0.15)" strokeWidth="1" strokeDasharray="3 3">
            <line x1="30"  y1="30"  x2="70"  y2="20"  />
            <line x1="70"  y1="20"  x2="110" y2="40"  />
            <line x1="110" y1="40"  x2="100" y2="80"  />
            <line x1="100" y1="80"  x2="60"  y2="95"  />
            <line x1="60"  y1="95"  x2="25"  y2="75"  />
            <line x1="25"  y1="75"  x2="30"  y2="30"  />
            <line x1="70"  y1="20"  x2="60"  y2="95"  />
            <line x1="30"  y1="30"  x2="100" y2="80"  />
            <line x1="110" y1="40"  x2="25"  y2="75"  />
            {/* Linhas ao centro */}
            <line x1="70"  y1="57"  x2="30"  y2="30"  stroke="rgba(124,58,237,0.08)" />
            <line x1="70"  y1="57"  x2="110" y2="40"  stroke="rgba(124,58,237,0.08)" />
            <line x1="70"  y1="57"  x2="100" y2="80"  stroke="rgba(124,58,237,0.08)" />
            <line x1="70"  y1="57"  x2="25"  y2="75"  stroke="rgba(124,58,237,0.08)" />
          </g>

          {/* Nós externos — piscar aleatório */}
          {nodes.map((node, i) => {
            const isLit = litNode === i
            return (
              <g key={i}>
                {/* Halo externo — só aparece quando lit */}
                <circle
                  cx={node.cx} cy={node.cy}
                  r={node.r + 6}
                  fill="rgba(124,58,237,0.12)"
                  opacity={isLit ? 1 : 0}
                  style={{ transition: 'opacity 0.3s ease' }}
                />
                {/* Nó principal */}
                <circle
                  cx={node.cx} cy={node.cy} r={node.r}
                  fill={isLit ? '#a855f7' : '#7c3aed'}
                  filter={isLit ? 'url(#node-glow-lit)' : 'url(#node-glow-c)'}
                  opacity={isLit ? 1 : 0.7}
                  style={{ transition: 'all 0.3s ease' }}
                />
                {/* Reflexo */}
                <circle
                  cx={node.cx - node.r * 0.3}
                  cy={node.cy - node.r * 0.3}
                  r={node.r * 0.35}
                  fill="rgba(255,255,255,0.55)"
                />
              </g>
            )
          })}

          {/* Nó central — sempre brilhando */}
          <circle cx="70" cy="57" r="14" fill="rgba(124,58,237,0.08)">
            <animate attributeName="r" values="12;18;12" dur="3.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.15;0.04;0.15" dur="3.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="70" cy="57" r="9" fill="#6d28d9" filter="url(#node-glow-lit)" />
          <circle cx="70" cy="57" r="9" fill="url(#star-glow-c)" opacity="0.7" />
          <circle cx="67" cy="54" r="3" fill="rgba(255,255,255,0.55)" />

          {/* Spark central */}
          <path
            d="M70 50 L71.5 55.5 L77 57 L71.5 58.5 L70 64 L68.5 58.5 L63 57 L68.5 55.5 Z"
            fill="white" opacity="0.9"
          />
        </svg>

        {/* Badge */}
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase"
          style={{
            background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
            color: '#7c3aed',
            border: '1px solid rgba(124,58,237,0.15)',
            whiteSpace: 'nowrap',
          }}
        >
          IA Estratégica
        </div>
      </div>

      <p className="text-sm font-bold mb-1.5" style={{ color: '#1e1b4b' }}>
        Nenhum insight ainda
      </p>
      <p className="text-xs text-center leading-relaxed max-w-[230px]" style={{ color: '#9ca3af' }}>
        Gere análises estratégicas personalizadas com base nos dados reais da sua clínica.
      </p>
    </div>
  )
}

// ─── Robô SVG — com suporte ao mood "creating" (lâmpada) ─────────────────────
function RobotFace({ mood, isBlinking }: { mood: RobotMood; isBlinking: boolean }) {
  const isSleeping = mood === 'sleeping'
  const isCreating = mood === 'creating'

  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="cc-bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f1f5f9" /><stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="cc-visorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e1b4b" /><stop offset="100%" stopColor="#0f0a1e" />
        </linearGradient>
        <linearGradient id="cc-earGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" /><stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id="cc-lampGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" /><stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="cc-eyeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="cc-bodyGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="cc-lampGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Lâmpada saindo da cabeça — só no mood creating */}
      {isCreating && (
        <g>
          {/* Halo amarelo de brilho */}
          <circle cx="88" cy="-4" r="16" fill="rgba(251,191,36,0.15)">
            <animate attributeName="r" values="14;20;14" dur="1.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2;0.05;0.2" dur="1.2s" repeatCount="indefinite" />
          </circle>

          {/* Corpo da lâmpada */}
          <ellipse cx="88" cy="-8" rx="9" ry="11" fill="url(#cc-lampGrad)" filter="url(#cc-lampGlow)" />
          {/* Brilho interno */}
          <ellipse cx="85" cy="-12" rx="3.5" ry="4" fill="rgba(255,255,255,0.6)" />

          {/* Base da lâmpada (bocal) */}
          <rect x="83" y="2" width="10" height="3" rx="1.5" fill="#d97706" />
          <rect x="84" y="5" width="8"  height="2" rx="1"   fill="#b45309" />

          {/* Raios de luz */}
          <g stroke="#fde68a" strokeWidth="1.5" strokeLinecap="round" opacity="0.8">
            <line x1="88" y1="-22" x2="88" y2="-27">
              <animate attributeName="opacity" values="0.8;0.2;0.8" dur="0.8s" repeatCount="indefinite" />
            </line>
            <line x1="100" y1="-18" x2="104" y2="-22">
              <animate attributeName="opacity" values="0.6;0.1;0.6" dur="0.9s" begin="0.1s" repeatCount="indefinite" />
            </line>
            <line x1="76" y1="-18" x2="72" y2="-22">
              <animate attributeName="opacity" values="0.7;0.15;0.7" dur="1s" begin="0.2s" repeatCount="indefinite" />
            </line>
            <line x1="103" y1="-8" x2="108" y2="-8">
              <animate attributeName="opacity" values="0.5;0.1;0.5" dur="0.85s" begin="0.15s" repeatCount="indefinite" />
            </line>
            <line x1="73" y1="-8" x2="68" y2="-8">
              <animate attributeName="opacity" values="0.6;0.1;0.6" dur="0.95s" begin="0.05s" repeatCount="indefinite" />
            </line>
          </g>
        </g>
      )}

      {/* Orelhas */}
      <rect x="4"   y="36" width="14" height="22" rx="6" fill="url(#cc-earGrad)"  filter="url(#cc-bodyGlow)" />
      <rect x="7"   y="40" width="5"  height="4"  rx="2" fill="rgba(255,255,255,0.3)" />
      <rect x="102" y="36" width="14" height="22" rx="6" fill="url(#cc-earGrad)"  filter="url(#cc-bodyGlow)" />
      <rect x="108" y="40" width="5"  height="4"  rx="2" fill="rgba(255,255,255,0.3)" />

      {/* Corpo */}
      <rect x="14"  y="10" width="92" height="92" rx="26" fill="url(#cc-bodyGrad)" filter="url(#cc-bodyGlow)" />
      <rect x="14"  y="10" width="92" height="92" rx="26" fill="none" stroke="rgba(148,163,184,0.6)" strokeWidth="1.5" />
      <rect x="22"  y="14" width="76" height="18" rx="12" fill="rgba(255,255,255,0.7)" />

      {/* Visor */}
      <rect x="24"  y="22" width="72" height="68" rx="18" fill="url(#cc-visorGrad)" />
      {/* Reflexo amarelo no visor quando creating */}
      {isCreating && (
        <rect x="24" y="22" width="72" height="68" rx="18"
          fill="rgba(251,191,36,0.06)" />
      )}
      <rect x="30"  y="26" width="28" height="10" rx="6"  fill="rgba(255,255,255,0.08)" />

      {/* Olhos */}
      {isSleeping ? (
        <>
          <path d="M38 54 Q44 48 50 54" stroke="#06b6d4" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M70 54 Q76 48 82 54" stroke="#06b6d4" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ) : isCreating ? (
        // Olhos estrelinhas — confiante e criativo
        <>
          {/* Olho esquerdo — estrela */}
          <circle cx="44" cy="52" r="10" fill="rgba(251,191,36,0.15)" />
          <path d="M44 44 L45.5 49.5 L51 51 L45.5 52.5 L44 58 L42.5 52.5 L37 51 L42.5 49.5 Z"
            fill="#fbbf24" filter="url(#cc-eyeGlow)" />
          {/* Olho direito — estrela */}
          <circle cx="76" cy="52" r="10" fill="rgba(251,191,36,0.15)" />
          <path d="M76 44 L77.5 49.5 L83 51 L77.5 52.5 L76 58 L74.5 52.5 L69 51 L74.5 49.5 Z"
            fill="#fbbf24" filter="url(#cc-eyeGlow)" />
        </>
      ) : (
        <>
          <circle cx="44" cy="52" r="10" fill="rgba(6,182,212,0.15)" />
          <circle cx="44" cy="52" r={isBlinking ? 1 : 8} fill="#06b6d4" filter="url(#cc-eyeGlow)" style={{ transition: 'r 0.06s ease' }} />
          <circle cx="44" cy="52" r={isBlinking ? 0.5 : 4} fill="#cffafe" />
          <circle cx="41" cy="49" r={isBlinking ? 0 : 2} fill="rgba(255,255,255,0.8)" />
          <circle cx="76" cy="52" r="10" fill="rgba(6,182,212,0.15)" />
          <circle cx="76" cy="52" r={isBlinking ? 1 : 8} fill="#06b6d4" filter="url(#cc-eyeGlow)" style={{ transition: 'r 0.06s ease' }} />
          <circle cx="76" cy="52" r={isBlinking ? 0.5 : 4} fill="#cffafe" />
          <circle cx="73" cy="49" r={isBlinking ? 0 : 2} fill="rgba(255,255,255,0.8)" />
        </>
      )}

      {/* Boca */}
      {isSleeping ? (
        <line x1="50" y1="74" x2="70" y2="74" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
      ) : isCreating ? (
        // Sorriso confiante largo
        <path d="M42 68 Q60 84 78 68" stroke="#fbbf24" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      ) : mood === 'thinking' ? (
        <path d="M48 74 Q55 70 68 74" stroke="#06b6d4" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ) : mood === 'surprised' ? (
        <ellipse cx="60" cy="74" rx="8" ry="7" fill="#06b6d4" opacity="0.9" />
      ) : (
        <path d="M46 70 Q60 82 74 70" stroke="#06b6d4" strokeWidth="3" fill="none" strokeLinecap="round" />
      )}

      {/* Status online */}
      {!isSleeping && (
        <>
          <circle cx="88" cy="28" r="5" fill={isCreating ? '#fbbf24' : '#22c55e'} />
          <circle cx="88" cy="28" r="5" fill={isCreating ? '#fbbf24' : '#22c55e'} opacity="0.5">
            <animate attributeName="r" values="5;9;5" dur={isCreating ? '0.6s' : '2s'} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur={isCreating ? '0.6s' : '2s'} repeatCount="indefinite" />
          </circle>
        </>
      )}

      {/* Zzz dormindo */}
      {isSleeping && (
        <g>
          <text x="82" y="34" fontSize="10" fill="#a78bfa" fontWeight="bold" className="zzz-float" style={{ animationDelay: '0s'   }}>z</text>
          <text x="88" y="24" fontSize="13" fill="#c084fc" fontWeight="bold" className="zzz-float" style={{ animationDelay: '0.6s' }}>z</text>
          <text x="95" y="16" fontSize="16" fill="#e879f9" fontWeight="bold" className="zzz-float" style={{ animationDelay: '1.2s' }}>Z</text>
        </g>
      )}
    </svg>
  )
}

// ─── Componente Principal ────────────────────────────────────────────────────
export default function ConsultoraClinix() {
  const [visible, setVisible]         = useState(false)
  const [open, setOpen]               = useState(false)
  const [insights, setInsights]       = useState<Insight[]>([])
  const [loading, setLoading]         = useState(false)
  const [generating, setGenerating]   = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [mood, setMood]               = useState<RobotMood>('idle')
  const [isBlinking, setIsBlinking]   = useState(false)
  const [balloon, setBalloon]         = useState<string | null>(null)
  const [showBalloon, setShowBalloon] = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)

  const clinicaIdRef     = useRef<string | null>(null)
  const moodTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const balloonTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blinkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    blinkIntervalRef.current = setInterval(() => {
      if (mood === 'sleeping' || mood === 'creating') return
      setIsBlinking(true)
      setTimeout(() => setIsBlinking(false), 150)
    }, 3200)
    return () => { if (blinkIntervalRef.current) clearInterval(blinkIntervalRef.current) }
  }, [mood])

  const showMessage = useCallback((text: string, newMood: RobotMood = 'nodding') => {
    if (balloonTimerRef.current) clearTimeout(balloonTimerRef.current)
    setBalloon(text); setShowBalloon(true); setMood(newMood)
    balloonTimerRef.current = setTimeout(() => {
      setShowBalloon(false)
      setTimeout(() => setBalloon(null), 300)
      setMood('idle')
    }, 5000)
  }, [])

  const triggerMood = useCallback((newMood: RobotMood, duration = 2000) => {
    if (moodTimerRef.current) clearTimeout(moodTimerRef.current)
    setMood(newMood)
    if (duration < 999999) moodTimerRef.current = setTimeout(() => setMood('idle'), duration)
  }, [])

  useEffect(() => {
    if (!visible) return
    const sessionKey = `clinix_greeted_${new Date().toDateString()}`
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, '1')
      const hour = new Date().getHours()
      let greeting = '👋 Olá! Sou sua Consultora IA. Vamos crescer hoje?'
      if (hour >= 5  && hour < 12) greeting = '🌅 Bom dia! Pronta para analisar sua clínica!'
      if (hour >= 12 && hour < 18) greeting = '☀️ Boa tarde! Novos insights esperando por você!'
      if (hour >= 18)              greeting = '🌙 Boa noite! Revisando os dados do dia...'
      setTimeout(() => showMessage(greeting, 'waving'), 1500)
    }
    const checkHydration = setInterval(() => {
      const h = new Date().getHours(), m = new Date().getMinutes()
      if ((h === 10 || h === 15) && m === 0) showMessage('💧 Hora de se hidratar! Beba água agora.', 'waving')
    }, 60000)
    const idleBehavior = setInterval(() => {
      if (open || generating) return
      const r = Math.random()
      if      (r < 0.30) triggerMood('nodding', 1500)
      else if (r < 0.50) triggerMood('thinking', 2000)
      else if (r < 0.65) {
        const msg = DAILY_MESSAGES[Math.floor(Math.random() * DAILY_MESSAGES.length)]
        showMessage(msg.text, msg.mood)
      }
    }, 45000)
    const sleepTimer = setTimeout(() => { if (!open) triggerMood('sleeping', 999999) }, 180000)
    return () => { clearInterval(checkHydration); clearInterval(idleBehavior); clearTimeout(sleepTimer) }
  }, [visible, open, showMessage, triggerMood, generating])

  useEffect(() => {
    if (open && mood === 'sleeping') {
      triggerMood('waking', 800)
      setTimeout(() => triggerMood('excited', 1500), 900)
    }
  }, [open, mood, triggerMood])

  async function init() {
    try {
      const { data: s } = await supabase.auth.getSession()
      const userId = s.session?.user?.id
      if (!userId) return
      const { data: prof } = await supabase.from('profiles').select('clinica_id').eq('id', userId).single()
      if (!prof?.clinica_id) return
      clinicaIdRef.current = prof.clinica_id
      const { data: clinicaData } = await supabase.from('clinicas').select('planos(recursos)').eq('id', prof.clinica_id).single()
      const recursos = (clinicaData as any)?.planos?.recursos || {}
      if (!recursos.ia_consultora) return
      setVisible(true)
      await loadInsights(prof.clinica_id)
    } catch (e) { console.error('[ConsultoraClinix] init error', e) }
  }

  async function loadInsights(clinicaId: string) {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('consultora_insights').select('*')
        .eq('clinica_id', clinicaId)
        .order('created_at', { ascending: false })
        .limit(8)
      const list = (data || []) as Insight[]
      setInsights(list)
      setUnreadCount(list.filter(i => !i.lido).length)
    } finally { setLoading(false) }
  }

  async function marcarLido(id: string) {
    await supabase.from('consultora_insights').update({ lido: true }).eq('id', id)
    setInsights(prev => prev.map(i => i.id === id ? { ...i, lido: true } : i))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  async function marcarTodosLidos() {
    if (!clinicaIdRef.current) return
    await supabase.from('consultora_insights').update({ lido: true })
      .eq('clinica_id', clinicaIdRef.current).eq('lido', false)
    setInsights(prev => prev.map(i => ({ ...i, lido: true })))
    setUnreadCount(0)
  }

  async function deletarInsight(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await supabase.from('consultora_insights').delete().eq('id', id)
      setInsights(prev => {
        const novo = prev.filter(i => i.id !== id)
        setUnreadCount(novo.filter(i => !i.lido).length)
        return novo
      })
    } catch (err) { console.error('[ConsultoraClinix] delete error', err) }
    finally { setDeletingId(null) }
  }

  async function gerarNovosInsights() {
    if (generating) return
    setGenerating(true)
    triggerMood('creating', 999999) // ← mood confiante com lâmpada
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const freshToken = sessionData.session?.access_token
      if (!freshToken) { setGenerating(false); return }
      const res = await fetch('/api/consultora/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freshToken}` },
      })
      if (res.ok && clinicaIdRef.current) {
        triggerMood('excited', 2500)
        showMessage('✨ Novos insights gerados! Confira agora.', 'excited')
        await loadInsights(clinicaIdRef.current)
      } else {
        triggerMood('surprised', 1500)
      }
    } catch { triggerMood('surprised', 1500) }
    finally { setGenerating(false) }
  }

  const robotAnimClass: Record<RobotMood, string> = {
    idle:      'robot-float',
    thinking:  'robot-think',
    creating:  'robot-float',   // flutuação suave — lâmpada já anima
    excited:   'robot-excited',
    sleeping:  'robot-sleep',
    waking:    'robot-wake',
    nodding:   'robot-nod',
    waving:    'robot-wave',
    surprised: 'robot-surprised',
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  useEffect(() => { init() }, [])
  if (!visible) return null

  return (
    <>
      {/* ── Balão de fala ── */}
      {balloon && showBalloon && (
        <div className="fixed bottom-24 right-6 z-50 max-w-[200px] balloon-pop"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(124,58,237,0.15))' }}>
          <div className="rounded-2xl px-4 py-3 text-xs font-medium leading-relaxed"
            style={{
              background: '#ffffff',
              border: '1px solid rgba(124,58,237,0.15)',
              color: '#3b0764',
              boxShadow: '0 4px 20px rgba(124,58,237,0.1)',
            }}>
            {balloon}
          </div>
          <div className="absolute -bottom-2 right-8 w-3.5 h-3.5 rotate-45"
            style={{ background: '#ffffff', border: '1px solid rgba(124,58,237,0.15)', borderTop: 'none', borderLeft: 'none' }} />
        </div>
      )}

      {/* ── Botão flutuante ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${robotAnimClass[mood]}`}
        style={{
          background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #a855f7 100%)',
          boxShadow: mood === 'creating'
            ? '0 8px 32px rgba(251,191,36,0.4), 0 2px 8px rgba(0,0,0,0.15)'
            : '0 8px 32px rgba(124,58,237,0.45), 0 2px 8px rgba(0,0,0,0.15)',
          padding: '6px',
          transition: 'box-shadow 0.4s ease',
        }}
        title="Consultora IA Clinix"
      >
        <RobotFace mood={mood} isBlinking={isBlinking} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Painel principal ── */}
      {open && (
        <div
          className="fixed bottom-6 right-24 z-50 w-[400px] rounded-2xl overflow-hidden flex flex-col"
          style={{
            maxHeight: 'calc(100vh - 48px)',
            background: '#ffffff',
            border: '1px solid rgba(124,58,237,0.12)',
            boxShadow: '0 20px 60px rgba(18,18,28,0.12), 0 4px 16px rgba(124,58,237,0.08)',
          }}
        >
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between flex-shrink-0"
            style={{ borderBottom: '1px solid #f1f0ff' }}>
            <div className="flex items-center gap-3">
              <IconeRaio />
              <div>
                <p className="text-sm font-bold" style={{ color: '#1e1b4b' }}>Consultora Clinix</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  <p className="text-[10px] font-medium" style={{ color: '#7c3aed' }}>IA de Gestão • Online</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={marcarTodosLidos}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                  style={{ color: '#7c3aed', background: '#f5f3ff', border: '1px solid #e9d5ff' }}>
                  Marcar tudo
                </button>
              )}
              <button onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                style={{ color: '#9ca3af' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Faixa decorativa */}
          <div className="h-0.5 flex-shrink-0"
            style={{ background: 'linear-gradient(90deg, #7c3aed, #a855f7, #c084fc)' }} />

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50/50" style={{ minHeight: 0 }}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: 'rgba(124,58,237,0.1)' }} />
                  <div className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: '2px solid rgba(124,58,237,0.2)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="#7c3aed" opacity="0.9" />
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700">Analisando dados...</p>
                  <p className="text-xs text-gray-400 mt-0.5">Preparando insights da sua clínica</p>
                </div>
              </div>
            ) : insights.length === 0 ? (
              <ConstellationEmpty />
            ) : (
              <div className="p-4 space-y-2.5">
                {insights.map((insight, idx) => {
                  const pr   = PRIORIDADE[insight.prioridade] || PRIORIDADE.MEDIA
                  const tipo = TIPO_CONFIG[insight.tipo] || { emoji: '💡', label: 'Geral' }
                  const isNew = !insight.lido
                  return (
                    <div
                      key={insight.id}
                      onClick={() => { if (isNew) marcarLido(insight.id) }}
                      className="group relative rounded-xl p-4 transition-all duration-200 cursor-pointer hover:shadow-sm"
                      style={{
                        background: '#ffffff',
                        border: isNew ? '1px solid rgba(124,58,237,0.18)' : '1px solid #f3f4f6',
                        boxShadow: isNew ? '0 2px 12px rgba(124,58,237,0.06)' : '0 1px 4px rgba(18,18,28,0.04)',
                        opacity: deletingId === insight.id ? 0.4 : 1,
                        transition: 'all 0.18s ease',
                      }}
                    >
                      {isNew && (
                        <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
                          style={{ background: 'linear-gradient(180deg, #7c3aed, #a855f7)' }} />
                      )}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold tabular-nums"
                            style={{ color: isNew ? '#7c3aed' : '#d1d5db' }}>
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-400">
                            {tipo.emoji} {tipo.label}
                          </span>
                          {isNew && (
                            <span className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: pr.color, boxShadow: `0 0 4px ${pr.color}` }} />
                          )}
                        </div>
                        <button
                          onClick={(e) => deletarInsight(insight.id, e)}
                          disabled={deletingId === insight.id}
                          className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 flex-shrink-0"
                          style={{ color: '#fca5a5', border: '1px solid #fee2e2' }}
                          title="Remover"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-[13px] font-bold leading-snug mb-1.5"
                        style={{ color: isNew ? '#1e1b4b' : '#6b7280' }}>
                        {insight.titulo}
                      </p>
                      <p className="text-[11px] leading-relaxed text-gray-500">
                        {insight.descricao}
                      </p>
                      <div className="flex items-center justify-between mt-3 pt-2.5"
                        style={{ borderTop: '1px solid #f9fafb' }}>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: pr.bg, color: pr.text, border: `1px solid ${pr.border}` }}
                        >
                          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: pr.color }} />
                          {pr.label}
                        </span>
                        <span className="text-[10px] text-gray-300">{formatDate(insight.created_at)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Faixa decorativa */}
          <div className="h-0.5 flex-shrink-0"
            style={{ background: 'linear-gradient(90deg, #c084fc, #a855f7, #7c3aed)' }} />

          {/* Footer */}
          <div className="px-4 py-4 flex-shrink-0 bg-white" style={{ borderTop: '1px solid #f1f0ff' }}>
            <button
              onClick={gerarNovosInsights}
              disabled={generating}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{
                background: generating
                  ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                  : 'linear-gradient(135deg, #6d28d9, #7c3aed, #9333ea)',
                boxShadow: '0 6px 20px rgba(124,58,237,0.28)',
              }}
            >
              {generating ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Criando análise...</>
              ) : (
                <>✨ Gerar análise agora</>
              )}
            </button>
            <p className="text-center text-[10px] text-gray-400 mt-2">
              Baseado nos dados reais da sua clínica
            </p>
          </div>
        </div>
      )}
    </>
  )
}