'use client'

import Link from 'next/link'
import { ArrowLeft, Zap, Globe, Shield } from 'lucide-react'
import ClinixIcon from '@/components/ClinixIcon'

export default function SobrePage() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, #f8fafc, #ffffff, rgba(243,232,255,0.3))' }}>
      {/* Header */}
      <header className="fixed top-0 w-full z-50" style={{ 
        background: 'rgba(248,249,252,.82)', 
        backdropFilter: 'blur(18px) saturate(150%)',
        borderBottom: '1px solid rgba(0,0,0,.07)'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f8fafc, #f3e8ff)', border: '1px solid rgba(168,85,247,0.15)' }}>
                <ClinixIcon size={20} />
              </div>
              <span className="text-lg font-bold" style={{ color: 'rgba(18,18,28,.92)', letterSpacing: '-.02em' }}>
                CLINIX POWER
              </span>
            </Link>
            <Link href="/" className="flex items-center gap-2 text-sm font-medium" style={{ color: 'rgba(18,18,28,.50)' }}>
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f8fafc, #f3e8ff)', border: '2px solid rgba(168,85,247,0.2)' }}>
              <ClinixIcon size={40} />
            </div>
            <h1 className="font-bold mb-4" style={{ 
              fontSize: '1.9rem', 
              letterSpacing: '-.045em',
              color: 'rgba(18,18,28,.92)'
            }}>
              Zillox Digital: Liderando a Revolução da Fisioterapia em 2026
            </h1>
          </div>

          {/* Main Content */}
          <div className="cp-card p-8 md:p-12 mb-12">
            <p className="text-lg mb-6" style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
              Somos uma empresa de tecnologia sediada em <strong>Minas Gerais</strong>, atuando em todo o território nacional. A Zillox Digital nasceu com a missão de libertar profissionais de saúde da burocracia.
            </p>
            <p className="text-lg mb-6" style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
              O <strong style={{ color: '#a855f7' }}>Clinix Power</strong> é o ápice dessa jornada: um acelerador de resultados movido pela inteligência artificial mais avançada do mundo, desenhado para transformar clínicas comuns em potências de atendimento e faturamento.
            </p>
          </div>

          {/* Values Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="cp-card p-6 text-center">
              <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)' }}>
                <Zap className="w-6 h-6" style={{ color: '#a855f7' }} />
              </div>
              <h3 className="font-bold mb-2" style={{ fontSize: '.95rem', color: 'rgba(18,18,28,.92)' }}>
                Inovação
              </h3>
              <p className="text-sm" style={{ color: 'rgba(18,18,28,.50)' }}>
                IA de ponta para fisioterapia
              </p>
            </div>

            <div className="cp-card p-6 text-center">
              <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)' }}>
                <Globe className="w-6 h-6" style={{ color: '#a855f7' }} />
              </div>
              <h3 className="font-bold mb-2" style={{ fontSize: '.95rem', color: 'rgba(18,18,28,.92)' }}>
                Nacional
              </h3>
              <p className="text-sm" style={{ color: 'rgba(18,18,28,.50)' }}>
                Atuação em todo o Brasil
              </p>
            </div>

            <div className="cp-card p-6 text-center">
              <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)' }}>
                <Shield className="w-6 h-6" style={{ color: '#a855f7' }} />
              </div>
              <h3 className="font-bold mb-2" style={{ fontSize: '.95rem', color: 'rgba(18,18,28,.92)' }}>
                Segurança
              </h3>
              <p className="text-sm" style={{ color: 'rgba(18,18,28,.50)' }}>
                LGPD e criptografia total
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/cadastro-clinica"
              className="cp-btn-primary px-8 py-3.5 text-base font-semibold text-white inline-flex items-center justify-center gap-2"
            >
              Ativar por R$ 19,90
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--background)', borderTop: '1px solid var(--stroke)' }}>
        <div className="max-w-7xl mx-auto text-center text-sm" style={{ color: 'rgba(18,18,28,.50)' }}>
          <p>&copy; 2026 Zillox Digital. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
