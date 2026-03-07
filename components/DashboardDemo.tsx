'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  TrendingUp, Users, Calendar, DollarSign, FileText,
  Shield, Zap, ChevronRight, Check, Star, ArrowRight,
  AlertTriangle, Clock, BarChart2,
} from 'lucide-react'

// ─── Frases da Consultora — vendedora de final de funil ──────────────────────
const FRASES_CONSULTORA = [
  'Sua clínica perdeu R$ 3.200 este mês em faltas não recuperadas. Eu já sei como resolver.',
  'Prontuário incompleto na auditoria custa caro. Com a Power, nunca mais vai acontecer.',
  'Você sabia que 8 dos seus pacientes estão prestes a abandonar o tratamento?',
  'Seu concorrente já automatizou o CREFITO. Você ainda preenche papel?',
  'Cada hora vaga na quinta-feira é R$ 150 que não entra no seu caixa.',
  'Clínicas que usam IA crescem 34% mais rápido. A sua pode ser uma delas.',
  'Você trabalha muito. Deixa a tecnologia trabalhar por você também.',
  'Relatório para a Unimed pronto em 8 segundos. Sem você tocar em nada.',
  'Mais de 40% do seu faturamento está preso em burocracia que eu posso eliminar.',
  'Laudos em PDF com assinatura digital? A IA já fez os 34 deste mês.',
  'A cada 3 clínicas que abrem, 2 fecham por falta de gestão. Não seja estatística.',
  'Sua agenda tem 17% de ociosidade. Eu já sei quais pacientes contatar agora.',
  'Convênio com 47 dias de atraso? O mercado recebe em 28. Vamos resolver isso.',
  'Fisioterapeuta excelente + gestão fraca = clínica que não cresce. Muda isso hoje.',
  'Enviei automaticamente 12 relatórios para convênios este mês. Você nem percebeu.',
  'Paciente sem lembrete falta 3x mais. Ative o módulo e recupere R$ 1.800/mês.',
  'Documentação CREFITO organizada, auditada e entregue. Tudo sem papelada.',
  'Você fundou sua clínica para cuidar de pessoas, não para preencher formulários.',
  'Taxa de retorno de 87% é possível. Com a Power, sua clínica já chegou lá.',
  'Clique abaixo e veja em 30 segundos tudo que a IA encontrou na sua clínica.',
]

// ─── Métricas com dados para mini-gráfico sparkline ─────────────────────────
const METRICAS = [
  {
    label: 'Pacientes Ativos',
    valor: '127',
    delta: '+12 este mês',
    deltaPos: true,
    icon: Users,
    cor: '#7c3aed',
    corBg: 'rgba(124,58,237,0.08)',
    corBorder: 'rgba(124,58,237,0.14)',
    spark: [60, 65, 58, 72, 68, 80, 75, 88, 84, 92, 98, 100],
  },
  {
    label: 'Atendimentos',
    valor: '342',
    delta: '+28 esta semana',
    deltaPos: true,
    icon: Calendar,
    cor: '#06b6d4',
    corBg: 'rgba(6,182,212,0.07)',
    corBorder: 'rgba(6,182,212,0.14)',
    spark: [40, 55, 48, 62, 58, 70, 65, 78, 72, 85, 90, 100],
  },
  {
    label: 'Faturamento',
    valor: 'R$ 48,5k',
    delta: '+18% vs anterior',
    deltaPos: true,
    icon: DollarSign,
    cor: '#10b981',
    corBg: 'rgba(16,185,129,0.07)',
    corBorder: 'rgba(16,185,129,0.14)',
    spark: [50, 45, 60, 55, 68, 64, 72, 69, 80, 78, 90, 100],
  },
  {
    label: 'Taxa de Retorno',
    valor: '87%',
    delta: 'Acima da meta',
    deltaPos: true,
    icon: TrendingUp,
    cor: '#f59e0b',
    corBg: 'rgba(245,158,11,0.07)',
    corBorder: 'rgba(245,158,11,0.14)',
    spark: [55, 60, 58, 65, 62, 70, 68, 75, 72, 80, 84, 100],
  },
]

// ─── Insights da consultora ───────────────────────────────────────────────────
const INSIGHTS = [
  { tipo: 'FINANCEIRO', emoji: '💰', cor: '#f43f5e', badge: 'Alta prioridade',
    titulo: 'Você perdeu R$ 3.200 em faltas não reagendadas este mês',
    descricao: 'Identifiquei 21 faltas sem reagendamento em outubro. Com lembretes automáticos, clínicas recuperam até 68% desses horários. Ative e recupere essa receita ainda esta semana.' },
  { tipo: 'OPERACIONAL', emoji: '⚙️', cor: '#f59e0b', badge: 'Média prioridade',
    titulo: 'Terças com 94% de ocupação — quintas em apenas 51%',
    descricao: 'Realoque 4 horários vagos nas quintas e aumente seu faturamento mensal em até R$ 1.800 sem abrir novos dias de trabalho.' },
  { tipo: 'ESTRATÉGICO', emoji: '🚀', cor: '#7c3aed', badge: 'Alta prioridade',
    titulo: 'Lombalgia tem 3× mais retorno — você pode dobrar esse grupo',
    descricao: 'Lombalgia representa 38% dos atendimentos com maior índice de retorno (87%). Uma campanha de reativação pode gerar 14 novos agendamentos este mês.' },
  { tipo: 'FINANCEIRO', emoji: '💰', cor: '#f43f5e', badge: 'Alta prioridade',
    titulo: 'Unimed representa 61% da receita — risco de concentração real',
    descricao: 'Alta dependência de um único convênio é risco crítico. Clínicas saudáveis mantêm no máximo 40% em um único pagador.' },
  { tipo: 'OPERACIONAL', emoji: '⚙️', cor: '#f43f5e', badge: 'Alta prioridade',
    titulo: '8 pacientes com mais de 30 dias sem consulta e sem alta formal',
    descricao: 'Esses pacientes "sumidos" representam risco ético e de abandono. Um contato de retorno hoje pode recuperar 5 deles.' },
  { tipo: 'ESTRATÉGICO', emoji: '🚀', cor: '#f59e0b', badge: 'Média prioridade',
    titulo: 'Taxa de alta com evolução completa: apenas 34%',
    descricao: 'Prontuários incompletos dificultam recredenciamento de convênios e auditoria do CREFITO. Com evolução guiada, clínicas chegam a 91% de completude.' },
  { tipo: 'FINANCEIRO', emoji: '💰', cor: '#f43f5e', badge: 'Alta prioridade',
    titulo: 'Tempo médio de recebimento: 47 dias — mercado está em 28',
    descricao: 'Lotes TISS com atraso médio de 9 dias. Automatizar o envio pode antecipar R$ 6.200 em recebíveis ainda este trimestre.' },
  { tipo: 'OPERACIONAL', emoji: '⚙️', cor: '#f59e0b', badge: 'Média prioridade',
    titulo: '3 profissionais sem registro de evolução nos últimos 7 dias',
    descricao: 'Evolução em atraso coloca a clínica em risco de glosa. Alertas automáticos configurados para eles.' },
  { tipo: 'ESTRATÉGICO', emoji: '🚀', cor: '#10b981', badge: 'Baixa prioridade',
    titulo: 'Nenhum paciente deixou avaliação online nos últimos 60 dias',
    descricao: 'Clínicas com mais de 20 avaliações no Google recebem 3× mais ligações de novos pacientes.' },
  { tipo: 'FINANCEIRO', emoji: '💰', cor: '#10b981', badge: 'Baixa prioridade',
    titulo: 'Sessões avulsas sem plano custam 40% mais para fidelizar',
    descricao: 'Pacientes sem plano fechado abandonam 2× mais cedo. Pacotes de 10 e 20 sessões aumentam ticket médio e comprometimento.' },
]

// ─── Laudo final ─────────────────────────────────────────────────────────────
const LAUDO = {
  clinica: 'Clínica Demonstração Fisioterapia',
  crefito: 'CREFITO-4 / 123456-F',
  secoes: [
    { titulo: '📊 Resumo Executivo', itens: [
      'Faturamento total: R$ 48.520 (+18% vs. outubro)',
      '342 atendimentos realizados — 127 pacientes ativos',
      'Taxa de ocupação média: 73% (meta recomendada: 85%)',
      'Ticket médio por sessão: R$ 141,90',
    ]},
    { titulo: '⚠️ Pontos Críticos', itens: [
      'R$ 3.200 em receita perdida por faltas não reagendadas',
      '8 pacientes sem contato há +30 dias — risco ético de abandono',
      '61% da receita concentrada em único convênio (Unimed)',
      'Evolução completa em apenas 34% das altas — risco de glosa',
    ]},
    { titulo: '✅ Ações desta Semana', itens: [
      'Ativar lembretes automáticos 24h antes das consultas (+R$ 2.176/mês)',
      'Contatar os 8 pacientes inativos — modelo de mensagem disponível',
      'Criar pacote particular de 10 sessões com desconto progressivo',
      'Completar evoluções pendentes dos 3 profissionais em atraso',
    ]},
    { titulo: '🤖 Tecnologia Power — CREFITO Automatizado', destaque: true,
      texto: 'Graças à Tecnologia Clinix Power, você não precisa mais enviar papelada para o CREFITO-MG manualmente. Este mês a IA gerou e organizou automaticamente todos os documentos abaixo — com assinatura digital, validade jurídica e logotipo da sua clínica. Prontos para auditoria a qualquer momento.',
      stats: [
        { n: '127', l: 'Prontuários digitais' },
        { n: '34',  l: 'Laudos de alta PDF'  },
        { n: '12',  l: 'Relatórios convênios' },
        { n: '3',   l: 'Docs CREFITO'        },
      ],
    },
  ],
}

// ─── Sparkline SVG minimalista ───────────────────────────────────────────────
function Sparkline({ data, cor }: { data: number[]; cor: string }) {
  const w = 80, h = 28, pad = 2
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2)
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x},${y}`
  })
  const polyline = pts.join(' ')
  const lastX = parseFloat(pts[pts.length - 1].split(',')[0])
  const lastY = parseFloat(pts[pts.length - 1].split(',')[1])
  // Area fill path
  const area = `M${pts[0]} L${polyline.split(' ').slice(1).join(' ')} L${w - pad},${h} L${pad},${h} Z`

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${cor.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={area} fill={`url(#sg-${cor.replace('#','')})`} />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke={cor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle cx={lastX} cy={lastY} r="2.5" fill={cor} />
      <circle cx={lastX} cy={lastY} r="4" fill={cor} opacity="0.25">
        <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.25;0;0.25" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

// ─── Robô SVG completo com todos os moods ────────────────────────────────────
type Mood = 'idle' | 'blink' | 'smile' | 'nod' | 'wave' | 'excited' | 'creating' | 'thinking'

function RobotSVG({ mood, size = 56 }: { mood: Mood; size?: number }) {
  const isSleeping  = false
  const isCreating  = mood === 'creating'
  const isExcited   = mood === 'excited'
  const isThinking  = mood === 'thinking'
  const isBlinking  = mood === 'blink'
  const isSmiling   = mood === 'smile' || isExcited || isCreating
  const eyeR        = isBlinking ? 1 : 8

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id="r-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f1f5f9" /><stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="r-visor" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e1b4b" /><stop offset="100%" stopColor="#0f0a1e" />
        </linearGradient>
        <linearGradient id="r-ear" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" /><stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id="r-lamp" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" /><stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="r-glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="r-lampglow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Lâmpada — mood creating */}
      {isCreating && (
        <g>
          <circle cx="82" cy="-2" r="16" fill="rgba(251,191,36,0.12)">
            <animate attributeName="r" values="14;20;14" dur="1.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.18;0.04;0.18" dur="1.2s" repeatCount="indefinite" />
          </circle>
          <ellipse cx="82" cy="-6" rx="9" ry="11" fill="url(#r-lamp)" filter="url(#r-lampglow)" />
          <ellipse cx="79" cy="-10" rx="3" ry="3.5" fill="rgba(255,255,255,0.55)" />
          <rect x="77" y="4" width="10" height="3" rx="1.5" fill="#d97706" />
          <rect x="78" y="7" width="8"  height="2" rx="1"   fill="#b45309" />
          <g stroke="#fde68a" strokeWidth="1.5" strokeLinecap="round" opacity="0.85">
            <line x1="82" y1="-20" x2="82" y2="-26"><animate attributeName="opacity" values="0.85;0.2;0.85" dur="0.8s" repeatCount="indefinite"/></line>
            <line x1="94" y1="-16" x2="98" y2="-20"><animate attributeName="opacity" values="0.6;0.1;0.6" dur="0.9s" begin="0.1s" repeatCount="indefinite"/></line>
            <line x1="70" y1="-16" x2="66" y2="-20"><animate attributeName="opacity" values="0.7;0.1;0.7" dur="1s" begin="0.2s" repeatCount="indefinite"/></line>
          </g>
        </g>
      )}

      {/* Orelhas */}
      <rect x="4"   y="36" width="14" height="22" rx="6" fill="url(#r-ear)" />
      <rect x="7"   y="40" width="5"  height="4"  rx="2" fill="rgba(255,255,255,0.3)" />
      <rect x="102" y="36" width="14" height="22" rx="6" fill="url(#r-ear)" />
      <rect x="108" y="40" width="5"  height="4"  rx="2" fill="rgba(255,255,255,0.3)" />

      {/* Corpo */}
      <rect x="14" y="10" width="92" height="92" rx="26" fill="url(#r-body)" />
      <rect x="14" y="10" width="92" height="92" rx="26" fill="none" stroke="rgba(148,163,184,0.55)" strokeWidth="1.5" />
      <rect x="22" y="14" width="76" height="18" rx="12" fill="rgba(255,255,255,0.7)" />

      {/* Visor */}
      <rect x="24" y="22" width="72" height="68" rx="18" fill="url(#r-visor)" />
      {isCreating && <rect x="24" y="22" width="72" height="68" rx="18" fill="rgba(251,191,36,0.05)" />}
      <rect x="30" y="26" width="28" height="10" rx="6" fill="rgba(255,255,255,0.07)" />

      {/* Olhos */}
      {isCreating || isExcited ? (
        <>
          <circle cx="44" cy="52" r="10" fill="rgba(251,191,36,0.12)" />
          <path d="M44 44 L45.8 49.8 L52 51 L45.8 52.2 L44 58 L42.2 52.2 L36 51 L42.2 49.8 Z" fill="#fbbf24" filter="url(#r-glow)" />
          <circle cx="76" cy="52" r="10" fill="rgba(251,191,36,0.12)" />
          <path d="M76 44 L77.8 49.8 L84 51 L77.8 52.2 L76 58 L74.2 52.2 L68 51 L74.2 49.8 Z" fill="#fbbf24" filter="url(#r-glow)" />
        </>
      ) : isThinking ? (
        <>
          <circle cx="44" cy="52" r="10" fill="rgba(6,182,212,0.12)" />
          <circle cx="44" cy="52" r="8" fill="#06b6d4" filter="url(#r-glow)" opacity="0.7" />
          <circle cx="44" cy="52" r="4" fill="#cffafe" opacity="0.8" />
          <circle cx="76" cy="52" r="10" fill="rgba(6,182,212,0.12)" />
          <path d="M68 52 Q72 46 76 46 Q80 46 82 52" stroke="#06b6d4" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="82" cy="52" r="2.5" fill="#06b6d4" />
        </>
      ) : (
        <>
          <circle cx="44" cy="52" r="10" fill="rgba(6,182,212,0.12)" />
          <circle cx="44" cy="52" r={eyeR} fill="#06b6d4" filter="url(#r-glow)" style={{ transition: 'r 0.06s' }} />
          {!isBlinking && <><circle cx="44" cy="52" r="4" fill="#cffafe" /><circle cx="41" cy="49" r="2" fill="rgba(255,255,255,0.8)" /></>}
          <circle cx="76" cy="52" r="10" fill="rgba(6,182,212,0.12)" />
          <circle cx="76" cy="52" r={eyeR} fill="#06b6d4" filter="url(#r-glow)" style={{ transition: 'r 0.06s' }} />
          {!isBlinking && <><circle cx="76" cy="52" r="4" fill="#cffafe" /><circle cx="73" cy="49" r="2" fill="rgba(255,255,255,0.8)" /></>}
        </>
      )}

      {/* Boca */}
      {isSmiling ? (
        <path d="M42 68 Q60 86 78 68" stroke={isCreating || isExcited ? '#fbbf24' : '#06b6d4'} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      ) : isThinking ? (
        <path d="M48 74 Q55 70 68 74" stroke="#06b6d4" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M46 70 Q60 82 74 70" stroke="#06b6d4" strokeWidth="3" fill="none" strokeLinecap="round" />
      )}

      {/* LED status */}
      <circle cx="88" cy="28" r="5" fill={isCreating ? '#fbbf24' : '#22c55e'} />
      <circle cx="88" cy="28" r="5" fill={isCreating ? '#fbbf24' : '#22c55e'} opacity="0.4">
        <animate attributeName="r" values="5;9;5" dur={isCreating ? '0.6s' : '2s'} repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur={isCreating ? '0.6s' : '2s'} repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

// ─── Robô animado — sequência de moods ───────────────────────────────────────
function RobotAnimado({ size = 56 }: { size?: number }) {
  const [mood, setMood] = useState<Mood>('idle')
  const seq = useRef<Mood[]>(['blink','idle','smile','idle','nod','idle','blink','smile','idle','wave','idle'])
  const idx = useRef(0)

  useEffect(() => {
    const next = () => {
      idx.current = (idx.current + 1) % seq.current.length
      setMood(seq.current[idx.current])
    }
    const t = setInterval(next, 1200)
    return () => clearInterval(t)
  }, [])

  return (
    <div
      className={`${mood === 'nod' ? 'robot-nod' : mood === 'wave' ? 'robot-wave' : mood === 'smile' ? 'robot-excited' : 'robot-float'}`}
      style={{ display: 'inline-block', width: size, height: size }}
    >
      <RobotSVG mood={mood} size={size} />
    </div>
  )
}

// ─── Balão de fala com digitação ─────────────────────────────────────────────
function BalaoDeFala() {
  const [fraseIdx, setFraseIdx]     = useState(0)
  const [texto, setTexto]           = useState('')
  const [digitando, setDigitando]   = useState(true)
  const [visivel, setVisivel]       = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const digitarFrase = useCallback((frase: string) => {
    setTexto('')
    setDigitando(true)
    setVisivel(true)
    let i = 0
    const tick = () => {
      i++
      setTexto(frase.slice(0, i))
      if (i < frase.length) {
        timerRef.current = setTimeout(tick, 28 + Math.random() * 18)
      } else {
        setDigitando(false)
        // Espera 3s depois de terminar, apaga e vai para próxima
        timerRef.current = setTimeout(() => {
          setVisivel(false)
          timerRef.current = setTimeout(() => {
            setFraseIdx(prev => (prev + 1) % FRASES_CONSULTORA.length)
          }, 350)
        }, 3000)
      }
    }
    timerRef.current = setTimeout(tick, 28)
  }, [])

  useEffect(() => {
    digitarFrase(FRASES_CONSULTORA[fraseIdx])
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [fraseIdx, digitarFrase])

  return (
    <div
      style={{
        opacity: visivel ? 1 : 0,
        transform: visivel ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.97)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        maxWidth: 260,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          border: '1px solid rgba(124,58,237,0.14)',
          borderRadius: '14px 14px 14px 4px',
          padding: '10px 14px',
          boxShadow: '0 4px 20px rgba(124,58,237,0.1), 0 1px 4px rgba(0,0,0,0.05)',
          fontSize: '11px',
          fontWeight: 500,
          lineHeight: 1.55,
          color: '#1e1b4b',
          minHeight: 36,
          position: 'relative',
        }}
      >
        {texto}
        {digitando && (
          <span style={{
            display: 'inline-block', width: 2, height: 11,
            background: '#7c3aed', marginLeft: 2, verticalAlign: 'middle',
            animation: 'cursorBlink 0.7s step-end infinite',
          }} />
        )}
      </div>
    </div>
  )
}

// ─── Toast premium ───────────────────────────────────────────────────────────
function ToastPremium({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, maxWidth: 420, width: 'calc(100vw - 32px)',
        background: '#ffffff',
        border: '1px solid rgba(124,58,237,0.16)',
        borderRadius: 14,
        padding: '14px 18px',
        boxShadow: '0 12px 40px rgba(18,18,28,0.12), 0 2px 8px rgba(124,58,237,0.1)',
        display: 'flex', alignItems: 'flex-start', gap: 12,
        animation: 'slideUp 0.3s ease',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg, #4c1d95, #7c3aed)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
        padding: 4,
      }}>
        <RobotSVG mood="smile" size={28} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#1e1b4b', marginBottom: 2 }}>
          Funcionalidade disponível na versão completa
        </p>
        <p style={{ fontSize: 11, color: 'rgba(18,18,28,.5)', lineHeight: 1.5 }}>
          Ative o Clinix Power por R$ 19,90/mês e desbloqueie todos os recursos de gestão da sua clínica.
        </p>
      </div>
      <button onClick={onClose} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9ca3af', lineHeight: 1 }}>
        ✕
      </button>
    </div>
  )
}

// ─── Componente Principal ────────────────────────────────────────────────────
export default function DashboardDemo() {
  const [fase, setFase]               = useState<'dashboard' | 'consultora' | 'gerando' | 'laudo'>('dashboard')
  const [insightsVisiveis, setIV]     = useState<number[]>([])
  const [toast, setToast]             = useState(false)
  const [progresso, setProgresso]     = useState(0)
  const [progLabel, setProgLabel]     = useState('')
  const laudoRef                      = useRef<HTMLDivElement>(null)
  const timerRefs                     = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timerRefs.current.forEach(clearTimeout), [])

  function mostrarInsights() {
    setFase('consultora')
    setIV([])
    timerRefs.current.forEach(clearTimeout)
    timerRefs.current = INSIGHTS.map((_, i) =>
      setTimeout(() => setIV(prev => [...prev, i]), 400 + i * 280)
    )
  }

  function iniciarGeracao() {
    setFase('gerando')
    setProgresso(0)
    const etapas = [
      { p: 10, l: 'Lendo prontuários dos últimos 30 dias...' },
      { p: 22, l: 'Calculando receita e faltas não reagendadas...' },
      { p: 36, l: 'Analisando ocupação por dia da semana...' },
      { p: 50, l: 'Verificando evoluções e laudos pendentes...' },
      { p: 63, l: 'Cruzando dados TISS com convênios...' },
      { p: 74, l: 'Identificando pacientes em risco de abandono...' },
      { p: 84, l: 'Gerando recomendações personalizadas...' },
      { p: 92, l: 'Compilando documentação CREFITO...' },
      { p: 98, l: 'Finalizando relatório em PDF...' },
      { p: 100, l: 'Relatório gerado com sucesso.' },
    ]
    let i = 0
    const tick = () => {
      if (i >= etapas.length) {
        setTimeout(() => {
          setFase('laudo')
          setTimeout(() => laudoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
        }, 400)
        return
      }
      setProgresso(etapas[i].p)
      setProgLabel(etapas[i].l)
      i++
      setTimeout(tick, 380 + Math.random() * 220)
    }
    setTimeout(tick, 200)
  }

  // ─── Cards de dor melhorados ────────────────────────────────────────────────
  const DORES = [
    {
      icon: FileText,
      iconCor: '#7c3aed',
      iconBg: 'rgba(124,58,237,0.08)',
      titulo: 'Prontuários incompletos',
      subtitulo: 'Risco de glosa e auditoria',
      desc: 'A auditoria do CREFITO pode glosar até 30% dos seus atendimentos por documentação inadequada. Cada prontuário incompleto é um risco financeiro e ético.',
      badge: 'Risco crítico',
      badgeCor: '#f43f5e',
    },
    {
      icon: BarChart2,
      iconCor: '#06b6d4',
      iconBg: 'rgba(6,182,212,0.08)',
      titulo: 'Agenda com horários vagos',
      subtitulo: 'Receita invisível esperando',
      desc: 'Horários vagos nas quintas e sextas somam R$ 1.800/mês de potencial não capturado. A IA reorganiza sua agenda e contata pacientes automaticamente.',
      badge: 'Perda mensal',
      badgeCor: '#f59e0b',
    },
    {
      icon: Clock,
      iconCor: '#10b981',
      iconBg: 'rgba(16,185,129,0.08)',
      titulo: 'Convênios com atraso',
      subtitulo: '47 dias vs. 28 do mercado',
      desc: 'Envio manual de TISS atrasa recebíveis em até 19 dias. Automatizar esse processo pode antecipar R$ 6.200 em recebíveis ainda neste trimestre.',
      badge: 'Fluxo de caixa',
      badgeCor: '#7c3aed',
    },
  ]

  return (
    <div className="relative space-y-5">

      {/* Cursor blink keyframe inline */}
      <style>{`
        @keyframes cursorBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes slideUp { from{opacity:0;transform:translateX(-50%) translateY(12px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Toast */}
      {toast && <ToastPremium msg="" onClose={() => setToast(false)} />}

      {/* Badge modo demo */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: 'rgba(124,58,237,0.07)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.15)' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#7c3aed' }} />
          MODO DEMONSTRAÇÃO — dados fictícios
        </div>
        {fase !== 'dashboard' && (
          <button onClick={() => { setFase('dashboard'); timerRefs.current.forEach(clearTimeout) }}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:opacity-80"
            style={{ color: '#7c3aed', background: '#f5f3ff', border: '1px solid #e9d5ff' }}>
            ← Voltar ao dashboard
          </button>
        )}
      </div>

      {/* ══════════ FASE: DASHBOARD ══════════ */}
      {fase === 'dashboard' && (
        <>
          {/* Métricas com sparkline */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {METRICAS.map((m, i) => {
              const Icon = m.icon
              return (
                <div key={i} className="cp-card p-4"
                  style={{ border: `1px solid ${m.corBorder}`, background: m.corBg }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `rgba(${m.cor === '#7c3aed' ? '124,58,237' : m.cor === '#06b6d4' ? '6,182,212' : m.cor === '#10b981' ? '16,185,129' : '245,158,11'},.12)` }}>
                      <Icon className="w-4 h-4" style={{ color: m.cor }} />
                    </div>
                    <Sparkline data={m.spark} cor={m.cor} />
                  </div>
                  <div className="text-xl font-bold mt-1" style={{ color: 'rgba(18,18,28,.92)', letterSpacing: '-.03em' }}>{m.valor}</div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: 'rgba(18,18,28,.4)' }}>{m.label}</p>
                  <p className="text-[11px] font-medium mt-1" style={{ color: '#059669' }}>{m.delta}</p>
                </div>
              )
            })}
          </div>

          {/* Card Consultora — CTA principal
               LAYOUT: robô à esquerda | balão inline no fluxo (não absolute) | texto | botão
               O balão fica em linha com altura reservada — sem overflow:hidden para não cortar */}
          <div className="cp-card p-0" style={{ border: '1.5px solid rgba(124,58,237,0.18)', overflow: 'visible' }}>
            <div className="h-0.5 rounded-t-[inherit]" style={{ background: 'linear-gradient(90deg, #4c1d95, #7c3aed, #a855f7, #c084fc)' }} />
            <div className="p-5 md:p-6">

              {/* Linha 1: robô + balão de fala lado a lado — altura fixa para não pular layout */}
              <div className="flex items-start gap-3 mb-4" style={{ minHeight: 72 }}>
                {/* Robô + status */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #4c1d95, #7c3aed)', boxShadow: '0 6px 20px rgba(124,58,237,0.32)', padding: 4 }}>
                    <RobotAnimado size={40} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" style={{ boxShadow: '0 0 4px #4ade80' }} />
                    <span className="text-[9px] font-semibold" style={{ color: '#059669', letterSpacing: '.01em' }}>Online</span>
                  </div>
                </div>
                {/* Balão inline — ocupa espaço real mas altura mínima fixa evita salto */}
                <div style={{ flex: 1, minHeight: 48, display: 'flex', alignItems: 'center' }}>
                  <BalaoDeFala />
                </div>
              </div>

              {/* Linha 2: texto principal + botão */}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold mb-1.5" style={{ fontSize: '1.05rem', color: 'rgba(18,18,28,.92)', letterSpacing: '-.03em', lineHeight: 1.3 }}>
                    Sua clínica tem R$ 3.200 de receita que você ainda não recuperou este mês
                  </h3>
                  <p className="text-xs" style={{ color: 'rgba(18,18,28,.48)', lineHeight: 1.55 }}>
                    A IA analisou seus dados e encontrou 10 oportunidades práticas com plano de ação imediato.
                  </p>
                </div>
                <button onClick={mostrarInsights}
                  className="cp-btn-primary flex-shrink-0 flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-white text-xs transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg, #5b21b6, #7c3aed)', boxShadow: '0 6px 18px rgba(124,58,237,0.35)' }}>
                  <Zap className="w-3.5 h-3.5" />
                  Sentir a tecnologia Power
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>

          {/* Cards de dor — 3 colunas */}
          <div className="grid md:grid-cols-3 gap-3">
            {DORES.map((card, i) => {
              const Icon = card.icon
              return (
                <div key={i} className="cp-card p-5 cursor-pointer group"
                  onClick={() => setToast(true)}
                  style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: card.iconBg }}>
                      <Icon className="w-4.5 h-4.5" style={{ color: card.iconCor, width: 18, height: 18 }} />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ background: `rgba(${card.badgeCor === '#f43f5e' ? '244,63,94' : card.badgeCor === '#f59e0b' ? '245,158,11' : '124,58,237'},.08)`, color: card.badgeCor }}>
                      {card.badge}
                    </span>
                  </div>
                  <h4 className="font-bold text-[13px] mb-0.5" style={{ color: 'rgba(18,18,28,.88)', letterSpacing: '-.02em' }}>
                    {card.titulo}
                  </h4>
                  <p className="text-[11px] font-semibold mb-2.5" style={{ color: card.iconCor }}>
                    {card.subtitulo}
                  </p>
                  <p className="text-[11px] leading-relaxed mb-3" style={{ color: 'rgba(18,18,28,.48)' }}>
                    {card.desc}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] font-bold group-hover:gap-2 transition-all" style={{ color: '#7c3aed' }}>
                    Ver solução <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ══════════ FASE: CONSULTORA ══════════ */}
      {fase === 'consultora' && (
        <div className="space-y-3" style={{ animation: 'fadeInUp 0.35s ease' }}>

          {/* Header consultora */}
          <div className="cp-card p-5 overflow-hidden" style={{ border: '1.5px solid rgba(124,58,237,0.18)' }}>
            <div className="h-0.5 -mx-5 -mt-5 mb-4" style={{ background: 'linear-gradient(90deg, #4c1d95, #7c3aed, #a855f7, #c084fc)' }} />
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #4c1d95, #7c3aed)', boxShadow: '0 4px 14px rgba(124,58,237,0.3)', padding: 5 }}>
                  <RobotAnimado size={38} />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: 'rgba(18,18,28,.92)' }}>Diagnóstico da sua clínica</p>
                  <p className="text-[11px]" style={{ color: 'rgba(18,18,28,.42)' }}>
                    {insightsVisiveis.length < INSIGHTS.length
                      ? `Analisando dados em tempo real... (${insightsVisiveis.length}/${INSIGHTS.length})`
                      : `${INSIGHTS.length} oportunidades identificadas pela IA`}
                  </p>
                </div>
              </div>
              {insightsVisiveis.length === INSIGHTS.length && (
                <button onClick={iniciarGeracao}
                  className="cp-btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-xs transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg, #5b21b6, #7c3aed)', boxShadow: '0 4px 16px rgba(124,58,237,0.35)' }}>
                  <FileText className="w-3.5 h-3.5" />
                  Gerar laudo completo
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Insights progressivos */}
          <div className="space-y-2.5">
            {INSIGHTS.map((ins, i) => {
              const vis = insightsVisiveis.includes(i)
              const r = ins.cor === '#f43f5e' ? '244,63,94' : ins.cor === '#f59e0b' ? '245,158,11' : ins.cor === '#7c3aed' ? '124,58,237' : '16,185,129'
              return (
                <div key={i} className="cp-card p-4 relative overflow-hidden"
                  style={{
                    opacity: vis ? 1 : 0,
                    transform: vis ? 'translateY(0)' : 'translateY(10px)',
                    transition: 'opacity 0.4s ease, transform 0.4s ease',
                    border: `1px solid rgba(${r},.14)`,
                    background: `rgba(${r},.03)`,
                  }}>
                  {/* Linha lateral colorida */}
                  <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: ins.cor }} />
                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-base flex-shrink-0 mt-0.5">{ins.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-[12.5px] font-bold leading-snug" style={{ color: 'rgba(18,18,28,.9)' }}>{ins.titulo}</p>
                        <span className="flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{ background: `rgba(${r},.1)`, color: ins.cor }}>
                          {ins.badge}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(18,18,28,.5)' }}>{ins.descricao}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* CTA ao final */}
          {insightsVisiveis.length === INSIGHTS.length && (
            <div className="cp-card p-6 text-center" style={{ border: '1.5px solid rgba(124,58,237,0.18)', animation: 'fadeInUp 0.4s ease' }}>
              <p className="text-sm font-bold mb-1.5" style={{ color: 'rgba(18,18,28,.88)', letterSpacing: '-.02em' }}>
                A IA já mapeou todos os problemas. Quer o plano de solução completo?
              </p>
              <p className="text-xs mb-4" style={{ color: 'rgba(18,18,28,.42)', lineHeight: 1.55 }}>
                Gere o laudo estratégico com plano de ação, documentação CREFITO em PDF e relatório para convênios.
              </p>
              <button onClick={iniciarGeracao}
                className="cp-btn-primary inline-flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #5b21b6, #7c3aed)', boxShadow: '0 6px 20px rgba(124,58,237,0.35)' }}>
                <FileText className="w-4 h-4" />
                Gerar laudo — sentir a tecnologia Power
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════ FASE: GERANDO ══════════ */}
      {fase === 'gerando' && (
        <div className="cp-card p-10 md:p-14 flex flex-col items-center text-center"
          style={{ minHeight: 380, animation: 'fadeInUp 0.35s ease' }}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: 'linear-gradient(135deg, #4c1d95, #7c3aed)', boxShadow: '0 8px 28px rgba(124,58,237,0.4)', padding: 8 }}>
            <RobotSVG mood="creating" size={52} />
          </div>
          <p className="font-bold text-base mb-1" style={{ color: 'rgba(18,18,28,.92)', letterSpacing: '-.02em' }}>
            Consultora IA processando
          </p>
          <p className="text-xs mb-8" style={{ color: '#7c3aed', minHeight: '1.2em', fontWeight: 500 }}>{progLabel}</p>

          <div className="w-full max-w-xs">
            <div className="w-full h-2 rounded-full mb-2.5" style={{ background: 'rgba(124,58,237,0.08)' }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progresso}%`, background: 'linear-gradient(90deg, #5b21b6, #a855f7)' }} />
            </div>
            <p className="text-xs font-bold" style={{ color: '#7c3aed' }}>{progresso}% concluído</p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-2 w-full max-w-xs">
            {['Prontuários digitais', 'Laudos de alta PDF', 'Relatórios convênios', 'Docs CREFITO'].map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-400"
                style={{
                  background: progresso > (i + 1) * 22 ? 'rgba(16,185,129,0.07)' : 'rgba(0,0,0,0.03)',
                  color: progresso > (i + 1) * 22 ? '#059669' : 'rgba(18,18,28,.3)',
                  border: `1px solid ${progresso > (i + 1) * 22 ? 'rgba(16,185,129,0.18)' : 'transparent'}`,
                }}>
                {progresso > (i + 1) * 22
                  ? <Check className="w-3 h-3 flex-shrink-0" />
                  : <div className="w-3 h-3 rounded-full border border-current flex-shrink-0 opacity-30" />}
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ FASE: LAUDO ══════════ */}
      {fase === 'laudo' && (
        <div ref={laudoRef} className="space-y-4" style={{ animation: 'fadeInUp 0.4s ease' }}>

          {/* Header laudo */}
          <div className="cp-card overflow-hidden" style={{ border: '1.5px solid rgba(124,58,237,0.18)' }}>
            <div className="h-1" style={{ background: 'linear-gradient(90deg, #4c1d95, #7c3aed, #a855f7, #c084fc)' }} />
            <div className="p-5 md:p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #4c1d95, #7c3aed)', padding: 3 }}>
                      <RobotSVG mood="smile" size={20} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#7c3aed' }}>
                      Consultora Clinix Power IA
                    </span>
                  </div>
                  <h2 className="font-bold" style={{ fontSize: '1.15rem', color: 'rgba(18,18,28,.92)', letterSpacing: '-.03em' }}>
                    Relatório Estratégico — Diagnóstico Completo
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(18,18,28,.4)' }}>
                    {LAUDO.clinica} • {LAUDO.crefito} • {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
                  <Check className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
                  <span className="text-[11px] font-bold" style={{ color: '#059669' }}>Gerado com sucesso</span>
                </div>
              </div>

              <div className="space-y-4">
                {LAUDO.secoes.map((sec, i) => (
                  <div key={i} className="rounded-xl p-4"
                    style={{
                      background: sec.destaque ? 'linear-gradient(135deg, rgba(68,26,149,0.04), rgba(124,58,237,0.06))' : 'rgba(0,0,0,0.02)',
                      border: sec.destaque ? '1.5px solid rgba(124,58,237,0.15)' : '1px solid rgba(0,0,0,0.05)',
                    }}>
                    <p className="text-sm font-bold mb-3" style={{ color: sec.destaque ? '#4c1d95' : 'rgba(18,18,28,.85)' }}>{sec.titulo}</p>
                    {sec.texto ? (
                      <>
                        <p className="text-[12px] leading-relaxed mb-4" style={{ color: 'rgba(18,18,28,.6)' }}>{sec.texto}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                          {sec.stats?.map((s, j) => (
                            <div key={j} className="text-center p-3 rounded-xl"
                              style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)' }}>
                              <p className="text-xl font-bold" style={{ color: '#7c3aed', letterSpacing: '-.03em' }}>{s.n}</p>
                              <p className="text-[10px] font-medium mt-0.5" style={{ color: 'rgba(18,18,28,.45)' }}>{s.l}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-start gap-3 mt-4 p-3 rounded-xl"
                          style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.12)' }}>
                          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#7c3aed' }} />
                          <div>
                            <p className="text-xs font-bold mb-1" style={{ color: '#4c1d95' }}>
                              Tecnologia Power — Conformidade CREFITO Automatizada
                            </p>
                            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(18,18,28,.55)' }}>
                              Graças à Tecnologia Clinix Power, você <strong>não precisa mais enviar papelada para o CREFITO-MG manualmente</strong>.
                              A IA entregou tudo em PDF este mês — prontuários com assinatura digital, laudos com CID-10 e validade jurídica,
                              prontos para auditoria a qualquer momento. Fim das pastas. Fim dos atrasos.
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <ul className="space-y-2">
                        {sec.itens?.map((item, j) => (
                          <li key={j} className="flex items-start gap-2.5 text-[12px]" style={{ color: 'rgba(18,18,28,.62)' }}>
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#7c3aed' }} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 mt-5 pt-4"
                style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <p className="text-[10px]" style={{ color: 'rgba(18,18,28,.3)' }}>
                  Documento gerado automaticamente pela IA Consultora Clinix Power • clinixpower.com.br
                </p>
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 fill-current" style={{ color: '#f59e0b' }} />)}
                </div>
              </div>
            </div>
          </div>

          {/* CTA conversão final */}
          <div className="cp-card p-0 overflow-hidden" style={{ border: '1.5px solid rgba(124,58,237,0.22)' }}>
            <div className="h-1" style={{ background: 'linear-gradient(90deg, #4c1d95, #7c3aed, #a855f7, #c084fc)' }} />
            <div className="p-6 md:p-8 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#a855f7' }}>
                Você acabou de ver o futuro da sua clínica
              </p>
              <h3 className="font-bold mb-2" style={{ fontSize: '1.3rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)', lineHeight: 1.25 }}>
                Tudo isso acontece automaticamente.<br />
                <span style={{ color: '#7c3aed' }}>Todo mês. Sem você precisar fazer nada.</span>
              </h3>
              <p className="text-sm mb-6 mx-auto max-w-md" style={{ color: 'rgba(18,18,28,.48)', lineHeight: 1.6 }}>
                Prontuários, laudos, CREFITO, financeiro, agenda e IA estratégica — tudo por menos de R$ 1 por dia.
              </p>
              <a href="/cadastro-clinica"
                className="cp-btn-primary inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #5b21b6, #7c3aed)', boxShadow: '0 8px 24px rgba(124,58,237,0.4)' }}>
                <Zap className="w-4 h-4" />
                Ativar minha clínica — R$ 19,90/mês
                <ArrowRight className="w-4 h-4" />
              </a>
              <p className="text-[10px] mt-3" style={{ color: 'rgba(18,18,28,.28)' }}>
                Sem fidelidade • Cancela quando quiser • 7 dias grátis
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}