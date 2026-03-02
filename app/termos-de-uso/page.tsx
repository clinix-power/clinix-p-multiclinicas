'use client'

import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import ClinixIcon from '@/components/ClinixIcon'

export default function TermosDeUsoPage() {
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
          <div className="mb-12">
            <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)' }}>
              <FileText className="w-8 h-8" style={{ color: '#a855f7' }} />
            </div>
            <h1 className="font-bold mb-2" style={{ 
              fontSize: '1.9rem', 
              letterSpacing: '-.045em',
              color: 'rgba(18,18,28,.92)'
            }}>
              Termos de Uso
            </h1>
            <p style={{ color: 'rgba(18,18,28,.50)' }}>
              Última atualização: Fevereiro de 2026
            </p>
          </div>

          {/* Main Content */}
          <div className="cp-card p-8 md:p-12 space-y-6">
            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                1. Sobre o Serviço
              </h2>
              <p style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                O <strong style={{ color: '#a855f7' }}>Clinix Power</strong> é um software de gestão sob licença SaaS (Software as a Service) da <strong>Zillox Digital</strong>. Ao ativar o acelerador por <strong>R$ 19,90</strong>, o usuário concorda com o período de teste de 30 dias e limites de uso de IA para segurança da plataforma.
              </p>
            </section>

            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                2. Período de Teste e Cancelamento
              </h2>
              <p style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                O pagamento de ativação de R$ 19,90 garante 30 dias de acesso completo ao sistema. Após esse período, o usuário pode escolher continuar com um dos planos mensais (PRO ou ULTIMATE) ou cancelar sem custos adicionais. O cancelamento pode ser feito a qualquer momento através do painel de configurações ou entrando em contato com o suporte.
              </p>
            </section>

            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                3. Limites de Uso de IA
              </h2>
              <p style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                Para garantir a segurança e estabilidade da plataforma, existem limites de uso da inteligência artificial para geração de evoluções e laudos. Esses limites variam de acordo com o plano contratado e são aplicados para prevenir uso indevido e garantir qualidade do serviço para todos os usuários.
              </p>
            </section>

            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                4. Uso Proibido
              </h2>
              <p style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                É <strong>vedado</strong>:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-3" style={{ color: 'rgba(18,18,28,.92)' }}>
                <li>O uso indevido da marca Clinix Power ou Zillox Digital</li>
                <li>Engenharia reversa do sistema de IA</li>
                <li>Compartilhamento de credenciais de acesso</li>
                <li>Uso para fins ilegais ou antiéticos</li>
                <li>Tentativas de burlar os limites de uso estabelecidos</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                5. Propriedade Intelectual
              </h2>
              <p style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                Todo o código, design, algoritmos de IA e conteúdo do Clinix Power são propriedade exclusiva da Zillox Digital. O usuário adquire apenas o direito de uso do software, não de sua propriedade intelectual.
              </p>
            </section>

            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                6. Modificações nos Termos
              </h2>
              <p style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                A Zillox Digital reserva-se o direito de modificar estes termos a qualquer momento. Usuários serão notificados por e-mail sobre alterações significativas.
              </p>
            </section>

            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                7. Contato
              </h2>
              <p style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                Para dúvidas sobre os Termos de Uso, entre em contato: <a href="mailto:suporteclinixpower@gmail.com" className="font-semibold" style={{ color: '#a855f7' }}>suporteclinixpower@gmail.com</a>
              </p>
            </section>
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
