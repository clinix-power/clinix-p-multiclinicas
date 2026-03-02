'use client'

import Link from 'next/link'
import { ArrowLeft, Shield, Lock, Eye, Database } from 'lucide-react'
import ClinixIcon from '@/components/ClinixIcon'

export default function PrivacidadePage() {
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
              <Shield className="w-8 h-8" style={{ color: '#a855f7' }} />
            </div>
            <h1 className="font-bold mb-2" style={{ 
              fontSize: '1.9rem', 
              letterSpacing: '-.045em',
              color: 'rgba(18,18,28,.92)'
            }}>
              Política de Privacidade
            </h1>
            <p style={{ color: 'rgba(18,18,28,.50)' }}>
              Última atualização: Fevereiro de 2026
            </p>
          </div>

          {/* Main Content */}
          <div className="cp-card p-8 md:p-12 space-y-6 mb-12">
            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                1. Compromisso com a LGPD
              </h2>
              <p style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                A <strong>Zillox Digital</strong> cumpre rigorosamente a <strong>Lei Geral de Proteção de Dados (LGPD)</strong>. Seus dados e os de seus pacientes são tratados com o mais alto nível de segurança e confidencialidade.
              </p>
            </section>

            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                2. Dados Coletados
              </h2>
              <p className="mb-3" style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                Coletamos apenas os dados necessários para o funcionamento do sistema:
              </p>
              <ul className="list-disc list-inside space-y-2" style={{ color: 'rgba(18,18,28,.92)' }}>
                <li><strong>Dados da clínica:</strong> Nome, endereço, CNPJ, responsável técnico</li>
                <li><strong>Dados do usuário:</strong> Nome, e-mail, telefone, CREFITO</li>
                <li><strong>Dados de pacientes:</strong> Informações clínicas necessárias para atendimento</li>
                <li><strong>Dados de uso:</strong> Logs de acesso e utilização do sistema</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                3. Segurança dos Dados
              </h2>
              <p style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                Todos os dados são <strong>criptografados</strong> em trânsito e em repouso. Utilizamos protocolos de segurança de nível bancário e servidores em conformidade com as melhores práticas internacionais. Seus dados <strong>nunca são compartilhados</strong> com terceiros sem sua autorização expressa.
              </p>
            </section>

            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                4. Processamento de IA
              </h2>
              <p style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                O processamento de dados de saúde via inteligência artificial é <strong>anônimo e seguro</strong>. A IA do Clinix Power não armazena informações identificáveis dos pacientes. Todos os dados processados são anonimizados e utilizados exclusivamente para gerar evoluções e laudos dentro do seu ambiente seguro.
              </p>
            </section>

            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                5. Seus Direitos
              </h2>
              <p className="mb-3" style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                De acordo com a LGPD, você tem direito a:
              </p>
              <ul className="list-disc list-inside space-y-2" style={{ color: 'rgba(18,18,28,.92)' }}>
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir dados incompletos ou desatualizados</li>
                <li>Solicitar a exclusão de dados</li>
                <li>Revogar consentimento a qualquer momento</li>
                <li>Exportar seus dados em formato estruturado</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                6. Retenção de Dados
              </h2>
              <p style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                Mantemos seus dados pelo tempo necessário para prestação do serviço e cumprimento de obrigações legais. Após o cancelamento da conta, os dados são mantidos por 5 anos conforme exigência do Conselho Federal de Fisioterapia e Terapia Ocupacional (COFFITO) e então permanentemente excluídos.
              </p>
            </section>

            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                7. Contato e Suporte
              </h2>
              <p style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                Para exercer seus direitos ou esclarecer dúvidas sobre privacidade, entre em contato com nosso Encarregado de Dados (DPO):
              </p>
              <p className="mt-3">
                <a href="mailto:suporteclinixpower@gmail.com" className="font-semibold" style={{ color: '#a855f7' }}>
                  suporteclinixpower@gmail.com
                </a>
              </p>
            </section>
          </div>

          {/* Security Features */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="cp-card p-6">
              <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)' }}>
                <Lock className="w-6 h-6" style={{ color: '#a855f7' }} />
              </div>
              <h3 className="font-bold mb-2" style={{ fontSize: '.95rem', color: 'rgba(18,18,28,.92)' }}>
                Criptografia Total
              </h3>
              <p className="text-sm" style={{ color: 'rgba(18,18,28,.50)' }}>
                Dados protegidos com criptografia AES-256
              </p>
            </div>

            <div className="cp-card p-6">
              <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)' }}>
                <Eye className="w-6 h-6" style={{ color: '#a855f7' }} />
              </div>
              <h3 className="font-bold mb-2" style={{ fontSize: '.95rem', color: 'rgba(18,18,28,.92)' }}>
                Privacidade por Design
              </h3>
              <p className="text-sm" style={{ color: 'rgba(18,18,28,.50)' }}>
                Segurança integrada desde a arquitetura
              </p>
            </div>

            <div className="cp-card p-6">
              <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)' }}>
                <Database className="w-6 h-6" style={{ color: '#a855f7' }} />
              </div>
              <h3 className="font-bold mb-2" style={{ fontSize: '.95rem', color: 'rgba(18,18,28,.92)' }}>
                Backup Automático
              </h3>
              <p className="text-sm" style={{ color: 'rgba(18,18,28,.50)' }}>
                Seus dados sempre seguros e recuperáveis
              </p>
            </div>

            <div className="cp-card p-6">
              <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)' }}>
                <Shield className="w-6 h-6" style={{ color: '#a855f7' }} />
              </div>
              <h3 className="font-bold mb-2" style={{ fontSize: '.95rem', color: 'rgba(18,18,28,.92)' }}>
                Conformidade LGPD
              </h3>
              <p className="text-sm" style={{ color: 'rgba(18,18,28,.50)' }}>
                100% em conformidade com a legislação
              </p>
            </div>
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
