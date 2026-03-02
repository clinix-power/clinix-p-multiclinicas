'use client'

import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'
import ClinixIcon from '@/components/ClinixIcon'

export default function LGPDPage() {
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
            <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <Shield className="w-8 h-8" style={{ color: '#22c55e' }} />
            </div>
            <h1 className="font-bold mb-2" style={{ 
              fontSize: '1.9rem', 
              letterSpacing: '-.045em',
              color: 'rgba(18,18,28,.92)'
            }}>
              LGPD - Lei Geral de Proteção de Dados
            </h1>
            <p style={{ color: 'rgba(18,18,28,.50)' }}>
              Conformidade total com a legislação brasileira
            </p>
          </div>

          {/* Main Content */}
          <div className="cp-card p-8 md:p-12 space-y-6">
            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                Nosso Compromisso
              </h2>
              <p style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                A <strong>Zillox Digital</strong> cumpre rigorosamente a <strong>LGPD (Lei nº 13.709/2018)</strong>. Seus dados e os de seus pacientes são criptografados e <strong>nunca compartilhados</strong> com terceiros sem autorização expressa.
              </p>
            </section>

            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                Processamento de Dados de Saúde
              </h2>
              <p style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                O processamento de dados de saúde via inteligência artificial é <strong>anônimo e seguro</strong>. Nossa IA não armazena informações identificáveis dos pacientes. Todos os dados processados são:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-3" style={{ color: 'rgba(18,18,28,.92)' }}>
                <li><strong>Anonimizados:</strong> Removemos identificadores pessoais antes do processamento</li>
                <li><strong>Criptografados:</strong> Proteção AES-256 em trânsito e em repouso</li>
                <li><strong>Isolados:</strong> Cada clínica tem seu ambiente completamente separado</li>
                <li><strong>Auditados:</strong> Logs de acesso para rastreabilidade total</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                Bases Legais para Tratamento
              </h2>
              <p className="mb-3" style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                Tratamos dados pessoais com base nas seguintes hipóteses legais:
              </p>
              <ul className="list-disc list-inside space-y-2" style={{ color: 'rgba(18,18,28,.92)' }}>
                <li><strong>Execução de contrato:</strong> Dados necessários para prestação do serviço</li>
                <li><strong>Obrigação legal:</strong> Cumprimento de normas do COFFITO e CFM</li>
                <li><strong>Legítimo interesse:</strong> Melhoria contínua do sistema</li>
                <li><strong>Consentimento:</strong> Para funcionalidades opcionais</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                Direitos dos Titulares
              </h2>
              <p className="mb-3" style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                Garantimos todos os direitos previstos na LGPD:
              </p>
              <ul className="list-disc list-inside space-y-2" style={{ color: 'rgba(18,18,28,.92)' }}>
                <li>Confirmação da existência de tratamento</li>
                <li>Acesso aos dados</li>
                <li>Correção de dados incompletos, inexatos ou desatualizados</li>
                <li>Anonimização, bloqueio ou eliminação</li>
                <li>Portabilidade dos dados</li>
                <li>Eliminação dos dados tratados com consentimento</li>
                <li>Informação sobre compartilhamento</li>
                <li>Revogação do consentimento</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                Segurança da Informação
              </h2>
              <p style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                Implementamos medidas técnicas e organizacionais para proteger seus dados:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-3" style={{ color: 'rgba(18,18,28,.92)' }}>
                <li>Criptografia de ponta a ponta</li>
                <li>Autenticação de dois fatores (2FA) disponível</li>
                <li>Monitoramento 24/7 de segurança</li>
                <li>Backup automático diário</li>
                <li>Servidores em datacenters certificados</li>
                <li>Testes de penetração regulares</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                Encarregado de Dados (DPO)
              </h2>
              <p style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento de dados pessoais, entre em contato com nosso Encarregado de Proteção de Dados:
              </p>
              <div className="mt-4 p-4 rounded-lg" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <p className="font-semibold mb-1" style={{ color: '#a855f7' }}>Suporte Oficial</p>
                <a href="mailto:suporteclinixpower@gmail.com" className="font-semibold" style={{ color: '#a855f7' }}>
                  suporteclinixpower@gmail.com
                </a>
              </div>
            </section>

            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                Incidentes de Segurança
              </h2>
              <p style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares, comunicaremos imediatamente a Autoridade Nacional de Proteção de Dados (ANPD) e os titulares afetados, conforme determina a LGPD.
              </p>
            </section>

            <section>
              <h2 className="font-bold mb-3" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>
                Atualizações
              </h2>
              <p style={{ color: 'rgba(18,18,28,.92)', lineHeight: '1.6' }}>
                Esta política pode ser atualizada periodicamente. Notificaremos os usuários sobre alterações significativas através do e-mail cadastrado.
              </p>
              <p className="mt-3 text-sm" style={{ color: 'rgba(18,18,28,.50)' }}>
                Última atualização: Fevereiro de 2026
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
