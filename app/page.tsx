'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Brain, 
  FileText, 
  TrendingUp, 
  Users, 
  Shield, 
  Zap,
  Check,
  ArrowRight,
  Star,
  X,
  Sparkles,
  Calendar,
  BarChart3,
  AlertCircle,
  PenTool
} from 'lucide-react'
import ClinixIcon from '@/components/ClinixIcon'
import WhatsAppButton from '@/components/WhatsAppButton'
import DashboardDemo from '@/components/DashboardDemo'

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, #f8fafc, #ffffff, rgba(243,232,255,0.3))' }}>
      {/* 1. HEADER FIXO (sticky) */}
      <header className="fixed top-0 w-full z-50" style={{ 
        background: 'rgba(248,249,252,.82)', 
        backdropFilter: 'blur(18px) saturate(150%)',
        borderBottom: '1px solid rgba(0,0,0,.07)'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f8fafc, #f3e8ff)', border: '1px solid rgba(168,85,247,0.15)' }}>
                <ClinixIcon size={20} />
              </div>
              <span className="text-lg font-bold" style={{ color: 'rgba(18,18,28,.92)', letterSpacing: '-.02em' }}>
                CLINIX POWER
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#funcionalidades" className="text-sm font-medium" style={{ color: 'rgba(18,18,28,.50)' }}>Funcionalidades</a>
              <a href="#planos" className="text-sm font-medium" style={{ color: 'rgba(18,18,28,.50)' }}>Planos</a>
              <a href="#depoimentos" className="text-sm font-medium" style={{ color: 'rgba(18,18,28,.50)' }}>Depoimentos</a>
              <Link 
                href="/login" 
                className="cp-btn px-4 py-2 text-sm"
                style={{ color: 'rgba(18,18,28,.92)' }}
              >
                Login
              </Link>
              <Link 
                href="/cadastro-clinica" 
                className="cp-btn-primary px-5 py-2 text-sm text-white"
              >
                Ativar por R$ 19,90
              </Link>
            </nav>
            {/* Menu Mobile */}
            <div className="md:hidden flex items-center gap-2">
              <Link 
                href="/login" 
                className="cp-btn px-3 py-1.5 text-xs"
                style={{ color: 'rgba(18,18,28,.92)' }}
              >
                Login
              </Link>
              <Link 
                href="/cadastro-clinica" 
                className="cp-btn-primary px-3 py-1.5 text-xs text-white"
              >
                Ativar R$ 19,90
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Badge animado */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{ 
                background: 'rgba(168,85,247,0.08)',
                border: '1px solid rgba(168,85,247,0.2)'
              }}
            >
              <Sparkles className="w-4 h-4" style={{ color: '#a855f7' }} />
              <span className="text-sm font-semibold" style={{ color: '#a855f7' }}>
                Tecnologia de IA para Fisioterapeutas Brasileiros
              </span>
            </motion.div>

            <h1 className="font-bold mb-6" style={{ 
              fontSize: '1.9rem', 
              letterSpacing: '-.045em',
              lineHeight: '1.1'
            }}>
              <span style={{ color: 'rgba(18,18,28,.92)' }}>Sua clínica merece mais do que planilha e papel.</span>
              <br />
              <span style={{ color: '#a855f7' }}>A plataforma de gestão mais inteligente para fisioterapeutas do Brasil.</span>
            </h1>
            
            <p className="text-lg mb-3 max-w-2xl mx-auto" style={{ 
              color: 'rgba(18,18,28,.50)',
              lineHeight: '1.5'
            }}>
              A inteligência que automatiza sua clínica enquanto você foca no paciente.
              <br />
              Evoluções com IA GEMINI, dashboard financeiro mais sofisticado do mercado e muito mais em um só lugar.{' '}
              <svg 
                className="inline-block w-5 h-5 ml-1" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ verticalAlign: 'middle', marginTop: '-2px' }}
              >
                <path 
                  d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" 
                  fill="#a855f7" 
                  stroke="#a855f7" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8 mt-10">
              <Link 
                href="/cadastro-clinica"
                className="cp-btn-primary px-8 py-3.5 text-base font-semibold text-white inline-flex items-center justify-center gap-2"
              >
                Ativar Tecnologia CLINIX por R$ 19,90
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <p className="text-sm" style={{ color: 'rgba(18,18,28,.50)' }}>
              30 dias de acesso completo. Cancele quando quiser.
            </p>

            {/* Dashboard Demo (Modo Vitrine) */}
            <div className="mt-16">
              <DashboardDemo />
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. SEÇÃO COMPARAÇÃO: FISIO COMUM vs FISIO CLINIX POWER 2026 */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Coluna Esquerda: Fisio Comum */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="cp-card p-8"
              style={{ borderColor: 'rgba(0,0,0,.12)' }}
            >
              <h3 className="text-lg font-bold mb-6" style={{ color: 'rgba(18,18,28,.92)', letterSpacing: '-.02em' }}>
                Fisioterapia Comum
              </h3>
              <ul className="space-y-4">
                {[
                  'Papelada manual',
                  'Evoluções lentas',
                  'Prontuários físicos',
                  'Sem relatórios',
                  'Perde pacientes sem saber'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <X className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                    <span style={{ color: 'rgba(18,18,28,.50)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Coluna Direita: CLINIX POWER */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="cp-card p-8 relative"
              style={{ 
                border: '2px solid #a855f7',
                boxShadow: 'var(--shadow-card-hover)'
              }}
            >
              <div className="absolute -top-3 left-6 px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(180deg, #c084fc, #a855f7 55%, #9333ea)' }}>
                CLINIX POWER 2026
              </div>
              <h3 className="text-lg font-bold mb-6" style={{ color: '#a855f7', letterSpacing: '-.02em' }}>
                Fisioterapia do Futuro
              </h3>
              <ul className="space-y-4">
                {[
                  'IA gera evolução em segundos',
                  'Laudos PDF com CREFITO',
                  'Assinatura digital',
                  'Dashboard financeiro completo',
                  'Alertas de perda de pacientes'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                    <span className="font-medium" style={{ color: 'rgba(18,18,28,.92)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4. FUNCIONALIDADES (Features Grid) */}
      <section id="funcionalidades" className="py-20 px-4 sm:px-6 lg:px-8" style={{ background: 'rgba(248,249,252,.5)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-bold mb-4" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
              Tudo que você precisa em um só lugar
            </h2>
            <p style={{ color: 'rgba(18,18,28,.50)' }}>
              Tecnologia de ponta para fisioterapeutas modernos
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: 'IA para Evoluções',
                description: 'Inteligência artificial escreve evoluções profissionais em segundos'
              },
              {
                icon: FileText,
                title: 'Laudos PDF CREFITO',
                description: 'Gere laudos seguindo normas do CREFITO com poucos cliques'
              },
              {
                icon: PenTool,
                title: 'Assinatura Digital',
                description: 'Assine documentos digitalmente com validade jurídica'
              },
              {
                icon: TrendingUp,
                title: 'Gestão Financeira',
                description: 'Dashboard completo com receitas, despesas e métricas'
              },
              {
                icon: Calendar,
                title: 'Agenda Inteligente',
                description: 'Organize atendimentos e nunca perca um compromisso'
              },
              {
                icon: BarChart3,
                title: 'Dashboard Analytics',
                description: 'Métricas e relatórios para decisões estratégicas'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="cp-card p-6"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(168,85,247,0.1)' }}>
                  <feature.icon className="w-6 h-6" style={{ color: '#a855f7' }} />
                </div>
                <h3 className="font-bold mb-2" style={{ fontSize: '.95rem', letterSpacing: '-.02em', color: 'rgba(18,18,28,.92)' }}>
                  {feature.title}
                </h3>
                <p className="text-sm" style={{ color: 'rgba(18,18,28,.50)', lineHeight: '1.45' }}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. SEÇÃO DE PREÇOS */}
      <section id="planos" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-bold mb-4" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
              Escolha o plano ideal para sua clínica
            </h2>
            <p style={{ color: 'rgba(18,18,28,.50)' }}>
              Ative agora por R$ 19,90 e tenha 30 dias completos de acesso
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: 'PRO',
                price: '99,90',
                description: 'Para clínicas em crescimento',
                features: [
                  'Até 5 funcionários',
                  'Evoluções com IA',
                  'Assinatura Digital',
                  'Laudos PDF (Padrão CREFITO)',
                  'Gestão Financeira Completa',
                  'Modo Funcionário',
                  'Suporte Prioritário'
                ],
                popular: false
              },
              {
                name: 'ULTIMATE',
                price: '249,90',
                description: 'Ilimitado + IA Consultora Financeira',
                features: [
                  'Funcionários ILIMITADOS',
                  'Pacientes ILIMITADOS',
                  'Evoluções ILIMITADAS',
                  'Laudos ILIMITADOS',
                  'Evoluções com IA',
                  'Assinatura Digital + Carimbo',
                  'Laudos Completos CREFITO',
                  'Dashboard Financeiro NÍVEL BANKING',
                  'Gráficos de Desenvolvimento',
                  'Alertas de Perda de Pacientes',
                  'Calendário de Impostos Mensais',
                  'IA Consultora Financeira',
                  'Inteligência de Dados Avançada',
                  'Suporte VIP 24/7'
                ],
                popular: true
              }
            ].map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`relative cp-card p-8 ${plan.popular ? 'scale-105' : ''}`}
                style={plan.popular ? { border: '2px solid #a855f7' } : {}}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(180deg, #c084fc, #a855f7 55%, #9333ea)' }}>
                    Mais Popular
                  </div>
                )}
                
                <h3 className="font-bold mb-2" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                  {plan.name}
                </h3>
                <p className="mb-6" style={{ color: 'rgba(18,18,28,.50)' }}>{plan.description}</p>
                
                <div className="mb-2">
                  <span className="font-bold" style={{ fontSize: '2.5rem', color: 'rgba(18,18,28,.92)' }}>R$ {plan.price}</span>
                  <span style={{ color: 'rgba(18,18,28,.50)' }}>/mês</span>
                </div>

                <p className="mb-6 text-sm font-semibold" style={{ color: '#22c55e' }}>
                  Ative agora por R$ 19,90 — 30 dias completos
                </p>

                <Link
                  href="/cadastro-clinica"
                  className={`block w-full text-center py-3 rounded-full font-semibold mb-8 transition text-white ${
                    plan.popular ? 'cp-btn-primary' : 'cp-btn'
                  }`}
                  style={!plan.popular ? { background: 'rgba(168,85,247,0.1)', color: '#a855f7' } : {}}
                >
                  Ativar por R$ 19,90
                </Link>

                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                      <span className="text-sm" style={{ color: 'rgba(18,18,28,.92)' }}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p style={{ color: 'rgba(18,18,28,.50)' }}>
              Após 30 dias, escolha continuar no PRO ou ULTIMATE. Sem surpresas.
            </p>
          </div>
        </div>
      </section>

      {/* 6. DEPOIMENTOS (Social Proof) */}
      <section id="depoimentos" className="py-20 px-4 sm:px-6 lg:px-8" style={{ background: 'rgba(248,249,252,.5)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-bold mb-4" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
              O que dizem nossos clientes
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Dra. Mariana Oliveira',
                city: 'São Paulo, SP',
                text: 'A IA de evoluções economiza 2 horas do meu dia. Revolucionário!',
                rating: 5
              },
              {
                name: 'Dr. Carlos Mendes',
                city: 'Belo Horizonte, MG',
                text: 'Dashboard financeiro impecável. Finalmente sei exatamente como está minha clínica.',
                rating: 5
              },
              {
                name: 'Dra. Juliana Costa',
                city: 'Rio de Janeiro, RJ',
                text: 'Laudos profissionais que impressionam. Pacientes elogiam a organização.',
                rating: 5
              }
            ].map((testimonial, index) => {
              const initial = testimonial.name.split(' ')[1][0]
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="cp-card p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{ background: '#a855f7' }}>
                      {initial}
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: 'rgba(18,18,28,.92)' }}>{testimonial.name}</p>
                      <p className="text-xs" style={{ color: 'rgba(18,18,28,.50)' }}>{testimonial.city}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4" style={{ fill: '#22c55e', color: '#22c55e' }} />
                    ))}
                  </div>
                  <p className="text-sm italic" style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.45' }}>
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>


      {/* 7. CTA FINAL */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ background: 'linear-gradient(135deg, #a855f7, #9333ea)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-bold mb-6 text-white" style={{ fontSize: '1.9rem', letterSpacing: '-.045em' }}>
            Sua clínica merece tecnologia de ponta. Comece hoje.
          </h2>
          <p className="text-lg mb-8" style={{ color: 'rgba(255,255,255,.85)' }}>
            Junte-se a fisioterapeutas que já estão usando IA para economizar tempo e atender melhor
          </p>
          <Link
            href="/cadastro-clinica"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-full text-lg font-semibold transition hover:scale-105"
            style={{ 
              background: 'white',
              color: '#a855f7',
              boxShadow: 'var(--shadow-premium)'
            }}
          >
            Ativar por R$ 19,90
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--background)', borderTop: '1px solid var(--stroke)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f8fafc, #f3e8ff)', border: '1px solid rgba(168,85,247,0.15)' }}>
                  <ClinixIcon size={18} />
                </div>
                <span className="font-bold" style={{ color: 'rgba(18,18,28,.92)' }}>CLINIX POWER</span>
              </div>
              <p className="text-sm" style={{ color: 'rgba(18,18,28,.50)' }}>
                Sistema completo de gestão para clínicas de fisioterapia com IA integrada.
              </p>
            </div>
<div>
              <h4 className="font-semibold mb-4" style={{ color: 'rgba(18,18,28,.92)' }}>Produto</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#funcionalidades" className="transition hover:opacity-70" style={{ color: 'rgba(18,18,28,.50)' }}>Funcionalidades</a></li>
                <li><a href="#planos" className="transition hover:opacity-70" style={{ color: 'rgba(18,18,28,.50)' }}>Planos</a></li>
                <li><a href="#depoimentos" className="transition hover:opacity-70" style={{ color: 'rgba(18,18,28,.50)' }}>Depoimentos</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4" style={{ color: 'rgba(18,18,28,.92)' }}>Empresa</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/sobre" className="transition hover:opacity-70" style={{ color: 'rgba(18,18,28,.50)' }}>Sobre</Link></li>
                <li><a href="mailto:suporteclinixpower@gmail.com" className="transition hover:opacity-70" style={{ color: 'rgba(18,18,28,.50)' }}>Contato</a></li>
                <li><a href="https://wa.me/message/VQUXNOXPMPT6M1" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-70" style={{ color: 'rgba(18,18,28,.50)' }}>Suporte</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4" style={{ color: 'rgba(18,18,28,.92)' }}>Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/termos-de-uso" className="transition hover:opacity-70" style={{ color: 'rgba(18,18,28,.50)' }}>Termos de Uso</Link></li>
                <li><Link href="/privacidade" className="transition hover:opacity-70" style={{ color: 'rgba(18,18,28,.50)' }}>Privacidade</Link></li>
                <li><Link href="/lgpd" className="transition hover:opacity-70" style={{ color: 'rgba(18,18,28,.50)' }}>LGPD</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 text-center text-sm" style={{ borderTop: '1px solid var(--stroke)', color: 'rgba(18,18,28,.50)' }}>
            <p>&copy; 2026 Zillox Digital. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* WhatsApp Button */}
      <WhatsAppButton />
    </div>
  )
}