'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Copy,
  Loader2,
  Sparkles,
  AlertCircle,
  Clock,
  CreditCard,
  QrCode,
  FileText,
  Lock,
  ChevronDown,
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

type Metodo = 'credit_card' | 'pix' | 'boleto'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clinicaId = searchParams.get('clinica_id')

  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [clinica, setClinica] = useState<any>(null)
  const [plano, setPlano] = useState<any>(null)
  const [erro, setErro] = useState('')
  const [paymentApproved, setPaymentApproved] = useState(false)
  const [checkingPayment, setCheckingPayment] = useState(false)

  // Método selecionado
  const [metodo, setMetodo] = useState<Metodo>('pix')

  // PIX
  const [pixCode, setPixCode] = useState('')
  const [pixQrCode, setPixQrCode] = useState('')
  const [copied, setCopied] = useState(false)

  // Boleto
  const [boletoUrl, setBoletoUrl] = useState('')
  const [boletoBarcode, setBoletoBarcode] = useState('')
  const [copiedBoleto, setCopiedBoleto] = useState(false)

  // Cartão
  const [cartaoNumero, setCartaoNumero] = useState('')
  const [cartaoNome, setCartaoNome] = useState('')
  const [cartaoMes, setCartaoMes] = useState('')
  const [cartaoAno, setCartaoAno] = useState('')
  const [cartaoCvv, setCartaoCvv] = useState('')
  const [cartaoParcelas, setCartaoParcelas] = useState(1)

  useEffect(() => {
    if (!clinicaId) { router.push('/cadastro-clinica'); return }
    loadClinicaData()
  }, [clinicaId])

  const loadClinicaData = async () => {
    try {
      const { data, error } = await supabase
        .from('clinicas')
        .select('*, planos(*)')
        .eq('id', clinicaId)
        .single()
      if (error) throw error
      setClinica(data)
      setPlano(data.planos)
    } catch (e) {
      console.error('Erro ao carregar dados:', e)
      setErro('Erro ao carregar dados da clínica.')
    } finally {
      setLoading(false)
    }
  }

  const startPaymentCheck = () => {
    setCheckingPayment(true)
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('clinicas')
        .select('pagamento_ativacao_confirmado')
        .eq('id', clinicaId)
        .single()
      if (data?.pagamento_ativacao_confirmado) {
        clearInterval(interval)
        setPaymentApproved(true)
        setCheckingPayment(false)
        setTimeout(() => router.push('/login'), 3000)
      }
    }, 5000)
    setTimeout(() => { clearInterval(interval); setCheckingPayment(false) }, 600000)
  }

  const handlePagar = async () => {
    setErro('')
    setProcessando(true)

    try {
      const body: any = {
        clinicaId,
        valor: plano?.valor_ativacao,
        tipo: 'ATIVACAO',
        metodoPagamento: metodo,
      }

      if (metodo === 'credit_card') {
        body.dadosCartao = {
          numero: cartaoNumero.replace(/\s/g, ''),
          nome: cartaoNome,
          mes: cartaoMes,
          ano: cartaoAno,
          cvv: cartaoCvv,
          parcelas: cartaoParcelas,
        }
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Erro ao processar pagamento')
      }

      if (metodo === 'credit_card') {
        if (result.approved) {
          setPaymentApproved(true)
          setTimeout(() => router.push('/login'), 3000)
        } else {
          throw new Error('Cartão não aprovado. Verifique os dados ou tente outro método.')
        }
      } else if (metodo === 'pix') {
        setPixCode(result.pixCode || '')
        setPixQrCode(result.qrCode || '')
        startPaymentCheck()
      } else if (metodo === 'boleto') {
        setBoletoUrl(result.boletoUrl || '')
        setBoletoBarcode(result.boletoBarcode || '')
        startPaymentCheck()
      }
    } catch (e: any) {
      setErro(e.message || 'Erro ao processar pagamento.')
    } finally {
      setProcessando(false)
    }
  }

  const formatCartao = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()

  const copyText = (text: string, tipo: 'pix' | 'boleto') => {
    navigator.clipboard.writeText(text)
    if (tipo === 'pix') { setCopied(true); setTimeout(() => setCopied(false), 2000) }
    else { setCopiedBoleto(true); setTimeout(() => setCopiedBoleto(false), 2000) }
  }

  // ── Tela de aprovado ──
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
          <h1 className="text-3xl font-bold text-white mb-4">Pagamento Confirmado!</h1>
          <p className="text-slate-300 mb-6">
            Sua clínica foi ativada com sucesso. Você tem <strong>30 dias grátis</strong> para testar todas as funcionalidades.
          </p>
          <p className="text-slate-400 text-sm">Redirecionando para o login...</p>
        </motion.div>
      </div>
    )
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

  const metodos: { id: Metodo; label: string; icon: any; desc: string }[] = [
    { id: 'pix', label: 'PIX', icon: QrCode, desc: 'Aprovação imediata' },
    { id: 'credit_card', label: 'Cartão de Crédito', icon: CreditCard, desc: 'Até 12x' },
    { id: 'boleto', label: 'Boleto', icon: FileText, desc: 'Vence em 3 dias úteis' },
  ]

  const jaGerou = (metodo === 'pix' && pixCode) || (metodo === 'boleto' && (boletoUrl || boletoBarcode))

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
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">🚀 Ative o Poder da IA</h1>
          <p className="text-slate-400">
            Apenas R$ {plano?.valor_ativacao?.toFixed(2)} para desbloquear 30 dias de acesso completo
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">

          {/* ── Resumo do Pedido ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 h-fit"
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
                <span className="text-slate-400">Ativação</span>
                <span className="text-purple-400 font-bold text-xl">
                  R$ {plano?.valor_ativacao?.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
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
                  Após 30 dias, cobrado <strong>R$ {plano?.valor_mensal?.toFixed(2)}/mês</strong>. Cancele quando quiser.
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── Pagamento ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Forma de Pagamento</h2>

            {/* Seletor de método */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {metodos.map(m => {
                const Icon = m.icon
                const active = metodo === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => { setMetodo(m.id); setErro(''); setPixCode(''); setBoletoUrl(''); setBoletoBarcode('') }}
                    disabled={processando || checkingPayment}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center
                      ${active
                        ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-bold leading-tight">{m.label}</span>
                    <span className="text-[10px] opacity-70">{m.desc}</span>
                  </button>
                )
              })}
            </div>

            {/* ── Conteúdo por método ── */}
            <AnimatePresence mode="wait">

              {/* CARTÃO */}
              {metodo === 'credit_card' && (
                <motion.div
                  key="credit_card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Número do Cartão</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0000 0000 0000 0000"
                      value={cartaoNumero}
                      onChange={e => setCartaoNumero(formatCartao(e.target.value))}
                      maxLength={19}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Nome no Cartão</label>
                    <input
                      type="text"
                      placeholder="NOME COMO NO CARTÃO"
                      value={cartaoNome}
                      onChange={e => setCartaoNome(e.target.value.toUpperCase())}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Mês</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="MM"
                        value={cartaoMes}
                        onChange={e => setCartaoMes(e.target.value.replace(/\D/g, '').slice(0, 2))}
                        maxLength={2}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition text-center font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Ano</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="AAAA"
                        value={cartaoAno}
                        onChange={e => setCartaoAno(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength={4}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition text-center font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">CVV</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        placeholder="•••"
                        value={cartaoCvv}
                        onChange={e => setCartaoCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength={4}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition text-center font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Parcelas</label>
                    <div className="relative">
                      <select
                        value={cartaoParcelas}
                        onChange={e => setCartaoParcelas(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition appearance-none"
                      >
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                          <option key={n} value={n}>
                            {n}x de R$ {((plano?.valor_ativacao || 0) / n).toFixed(2)} {n === 1 ? '(sem juros)' : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Seus dados são criptografados e não ficam salvos em nosso servidor.</span>
                  </div>
                </motion.div>
              )}

              {/* PIX — antes de gerar */}
              {metodo === 'pix' && !pixCode && (
                <motion.div
                  key="pix_pre"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-4"
                >
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 text-center">
                    <QrCode className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                    <p className="text-slate-300 text-sm">
                      Clique em <strong className="text-white">Gerar PIX</strong> para obter o QR Code e o código Copia e Cola.
                    </p>
                    <p className="text-slate-500 text-xs mt-2">Aprovação em segundos após o pagamento.</p>
                  </div>
                </motion.div>
              )}

              {/* PIX — após gerar */}
              {metodo === 'pix' && pixCode && (
                <motion.div
                  key="pix_pos"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {pixQrCode && (
                    <div className="bg-white p-4 rounded-xl">
                      <img src={pixQrCode} alt="QR Code PIX" className="w-full h-auto max-w-[220px] mx-auto block" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Código Copia e Cola</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={pixCode}
                        readOnly
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-white text-xs font-mono"
                      />
                      <button
                        onClick={() => copyText(pixCode, 'pix')}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition flex items-center gap-2 text-sm whitespace-nowrap"
                      >
                        {copied ? <><CheckCircle2 className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar</>}
                      </button>
                    </div>
                  </div>
                  {checkingPayment && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
                      <div className="text-sm text-blue-300">
                        <p className="font-semibold">Aguardando pagamento...</p>
                        <p className="text-xs text-blue-400">Redirecionamento automático após confirmação.</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* BOLETO — antes de gerar */}
              {metodo === 'boleto' && !boletoUrl && !boletoBarcode && (
                <motion.div
                  key="boleto_pre"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-4"
                >
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 text-center">
                    <FileText className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                    <p className="text-slate-300 text-sm">
                      Clique em <strong className="text-white">Gerar Boleto</strong> para receber o código de barras.
                    </p>
                    <p className="text-slate-500 text-xs mt-2">Prazo de compensação: até 3 dias úteis.</p>
                  </div>
                </motion.div>
              )}

              {/* BOLETO — após gerar */}
              {metodo === 'boleto' && (boletoUrl || boletoBarcode) && (
                <motion.div
                  key="boleto_pos"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {boletoBarcode && (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Código de Barras</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={boletoBarcode}
                          readOnly
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-white text-xs font-mono"
                        />
                        <button
                          onClick={() => copyText(boletoBarcode, 'boleto')}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition flex items-center gap-2 text-sm whitespace-nowrap"
                        >
                          {copiedBoleto ? <><CheckCircle2 className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar</>}
                        </button>
                      </div>
                    </div>
                  )}
                  {boletoUrl && (
                    <a
                      href={boletoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 rounded-xl font-semibold text-white text-sm bg-slate-700 hover:bg-slate-600 transition flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Abrir Boleto PDF
                    </a>
                  )}
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-300">
                      O boleto pode levar até 3 dias úteis para compensar. Não feche esta página.
                    </p>
                  </div>
                  {checkingPayment && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
                      <p className="text-sm text-blue-300 font-semibold">Aguardando confirmação do boleto...</p>
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>

            {/* Erro */}
            {erro && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{erro}</p>
              </div>
            )}

            {/* Botão principal */}
            {!jaGerou && (
              <button
                onClick={handlePagar}
                disabled={processando || checkingPayment}
                className="mt-6 w-full py-4 rounded-xl font-bold text-white text-base
                  bg-gradient-to-r from-purple-600 to-violet-600
                  hover:from-purple-700 hover:to-violet-700
                  disabled:opacity-50 disabled:cursor-not-allowed
                  shadow-[0_4px_24px_rgba(168,85,247,0.4)]
                  transition-all duration-200 flex items-center justify-center gap-2"
              >
                {processando
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</>
                  : metodo === 'pix'
                    ? <><QrCode className="w-5 h-5" /> Gerar PIX — R$ {plano?.valor_ativacao?.toFixed(2)}</>
                    : metodo === 'boleto'
                      ? <><FileText className="w-5 h-5" /> Gerar Boleto — R$ {plano?.valor_ativacao?.toFixed(2)}</>
                      : <><Lock className="w-5 h-5" /> Pagar R$ {plano?.valor_ativacao?.toFixed(2)} com Segurança</>
                }
              </button>
            )}

            <p className="text-center text-xs text-slate-500 mt-3 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" /> Pagamento 100% seguro via Appmax
            </p>
          </motion.div>
        </div>

        <div className="text-center mt-8">
          <p className="text-slate-400 text-sm">
            Problemas com o pagamento?{' '}
            <a href="mailto:suporte@clinixpower.com.br" className="text-purple-400 hover:text-purple-300 transition">
              Entre em contato
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}