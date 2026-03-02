'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  CheckCircle2, 
  Copy, 
  Loader2, 
  Sparkles,
  AlertCircle,
  Clock
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-r-transparent" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const clinicaId = searchParams.get('clinica_id')
  
  const [loading, setLoading] = useState(true)
  const [clinica, setClinica] = useState<any>(null)
  const [plano, setPlano] = useState<any>(null)
  const [pixCode, setPixCode] = useState('')
  const [pixQrCode, setPixQrCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [checkingPayment, setCheckingPayment] = useState(false)
  const [paymentApproved, setPaymentApproved] = useState(false)

  useEffect(() => {
    if (!clinicaId) {
      router.push('/cadastro-clinica')
      return
    }
    loadClinicaData()
  }, [clinicaId])

  const loadClinicaData = async () => {
    try {
      const { data: clinicaData, error: clinicaError } = await supabase
        .from('clinicas')
        .select('*, planos(*)')
        .eq('id', clinicaId)
        .single()

      if (clinicaError) throw clinicaError

      setClinica(clinicaData)
      setPlano(clinicaData.planos)

      await generatePixPayment(clinicaData)

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const generatePixPayment = async (clinicaData: any) => {
    try {
      const response = await fetch('/api/pagamentos/gerar-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clinicaId: clinicaData.id,
          valor: clinicaData.planos.valor_ativacao,
          tipo: 'ATIVACAO'
        })
      })

      const result = await response.json()

      if (result.success) {
        setPixCode(result.pixCode || 'PIX_CODE_DEMO_12345')
        setPixQrCode(result.qrCode || '')
        startPaymentCheck()
      }

    } catch (error) {
      console.error('Erro ao gerar PIX:', error)
    }
  }

  const startPaymentCheck = () => {
    setCheckingPayment(true)
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('clinicas')
        .select('pagamento_ativacao_confirmado, status')
        .eq('id', clinicaId)
        .single()

      if (data?.pagamento_ativacao_confirmado) {
        clearInterval(interval)
        setPaymentApproved(true)
        setCheckingPayment(false)
        
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    }, 5000)

    setTimeout(() => {
      clearInterval(interval)
      setCheckingPayment(false)
    }, 600000)
  }

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Carregando...</p>
        </div>
      </div>
    )
  }

  if (paymentApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-slate-900/50 border border-green-500/50 rounded-2xl p-8 text-center"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Pagamento Confirmado!
          </h1>
          <p className="text-slate-300 mb-6">
            Sua clínica foi ativada com sucesso. Você tem <strong>30 dias grátis</strong> para testar todas as funcionalidades.
          </p>
          <p className="text-slate-400 text-sm">
            Redirecionando para o login...
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              CLINIX POWER
            </span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            🚀 Ative o Poder da IA
          </h1>
          <p className="text-slate-400">
            Apenas R$ 19,90 para desbloquear 30 dias de acesso completo ao melhor acelerador de Fisioterapia
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Resumo do Pedido */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Resumo do Pedido</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <span className="text-slate-400">Clínica</span>
                <span className="text-white font-semibold">{clinica?.nome_fantasia}</span>
              </div>
              
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <span className="text-slate-400">Plano</span>
                <span className="text-white font-semibold">{plano?.nome}</span>
              </div>
              
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <span className="text-slate-400">Valor Mensal</span>
                <span className="text-white">R$ {plano?.valor_mensal?.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <span className="text-slate-400">Pagamento de Ativação</span>
                <span className="text-purple-400 font-bold text-xl">
                  R$ {plano?.valor_ativacao?.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-semibold mb-1">O que você ganha:</p>
                  <ul className="space-y-1">
                    <li>✓ 30 dias de teste grátis</li>
                    <li>✓ Acesso completo a todas as funcionalidades</li>
                    <li>✓ IA para evoluções clínicas</li>
                    <li>✓ Laudos profissionais</li>
                    <li>✓ Controle financeiro</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-300">
                  Após 30 dias, você será cobrado <strong>R$ {plano?.valor_mensal?.toFixed(2)}/mês</strong>. Cancele quando quiser, sem multas.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Pagamento PIX */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Pagamento via PIX</h2>
            
            {pixQrCode && (
              <div className="bg-white p-4 rounded-xl mb-6">
                <img 
                  src={pixQrCode} 
                  alt="QR Code PIX" 
                  className="w-full h-auto"
                />
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Código PIX Copia e Cola
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pixCode}
                  readOnly
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm font-mono"
                />
                <button
                  onClick={copyPixCode}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-white mb-3">Como pagar:</h3>
              <ol className="space-y-2 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="font-bold text-purple-400">1.</span>
                  Abra o app do seu banco
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-purple-400">2.</span>
                  Escolha pagar com PIX
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-purple-400">3.</span>
                  Escaneie o QR Code ou cole o código
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-purple-400">4.</span>
                  Confirme o pagamento de R$ {plano?.valor_ativacao?.toFixed(2)}
                </li>
              </ol>
            </div>

            {checkingPayment && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
                <div className="text-sm text-blue-300">
                  <p className="font-semibold">Aguardando pagamento...</p>
                  <p className="text-xs text-blue-400">Você será redirecionado automaticamente após a confirmação</p>
                </div>
              </div>
            )}

            {!checkingPayment && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-300">
                  O pagamento pode levar até 2 minutos para ser confirmado. Não feche esta página.
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-slate-400 text-sm">
            Problemas com o pagamento?{' '}
            <a href="mailto:suporte@clinixpower.com" className="text-purple-400 hover:text-purple-300 transition">
              Entre em contato
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
