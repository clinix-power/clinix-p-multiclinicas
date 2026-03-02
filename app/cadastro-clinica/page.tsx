'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Building2, 
  Mail, 
  Phone, 
  User, 
  Lock, 
  ArrowRight, 
  Check,
  AlertCircle,
  Sparkles,
  Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import ClinixIcon from '@/components/ClinixIcon'

export default function CadastroClinicaPage() {
  const router = useRouter()
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    nomeFantasia: '',
    cnpj: '',
    whatsapp: '',
    email: '',
    telefone: '',
    cidade: '',
    estado: '',
    responsavelNome: '',
    responsavelEmail: '',
    responsavelTelefone: '',
    senha: '',
    confirmarSenha: '',
    planoSelecionado: 'ULTIMATE'
  })

  const planos = [
    {
      id: 'PRO',
      nome: 'PRO',
      preco: 99.90,
      usuarios: 5,
      pacientes: 500,
      descricao: 'Para clínicas em crescimento'
    },
    {
      id: 'ULTIMATE',
      nome: 'ULTIMATE',
      preco: 249.90,
      usuarios: 'Ilimitados',
      pacientes: 'Ilimitados',
      descricao: 'Ilimitado + IA Consultora Financeira',
      popular: true
    }
  ]

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 14) {
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
    }
    return value
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
    }
    return value
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value
    
    if (e.target.name === 'cnpj') {
      value = formatCNPJ(value)
    } else if (e.target.name === 'whatsapp' || e.target.name === 'telefone' || e.target.name === 'responsavelTelefone') {
      value = formatPhone(value)
    }
    
    setFormData({
      ...formData,
      [e.target.name]: value
    })
    setError('')
  }

  const handlePlanoChange = (planoId: string) => {
    setFormData({
      ...formData,
      planoSelecionado: planoId
    })
  }

  const validateStep1 = () => {
    if (!formData.nomeFantasia.trim()) {
      setError('Por favor, informe o nome da clínica')
      return false
    }
    if (!formData.cnpj.trim() || formData.cnpj.replace(/\D/g, '').length !== 14) {
      setError('Por favor, informe um CNPJ válido (14 dígitos)')
      return false
    }
    if (!formData.whatsapp.trim() || formData.whatsapp.replace(/\D/g, '').length < 10) {
      setError('Por favor, informe um WhatsApp válido')
      return false
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Por favor, informe um email válido')
      return false
    }
    if (!formData.telefone.trim()) {
      setError('Por favor, informe o telefone')
      return false
    }
    if (!formData.cidade.trim()) {
      setError('Por favor, informe a cidade')
      return false
    }
    if (!formData.estado.trim()) {
      setError('Por favor, informe o estado')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!formData.responsavelNome.trim()) {
      setError('Por favor, informe o nome do responsável')
      return false
    }
    if (!formData.responsavelEmail.trim() || !formData.responsavelEmail.includes('@')) {
      setError('Por favor, informe um email válido para o responsável')
      return false
    }
    if (!formData.senha || formData.senha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres')
      return false
    }
    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas não conferem')
      return false
    }
    return true
  }

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2)
    } else if (step === 2 && validateStep2()) {
      setStep(3)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateStep2()) return

    setLoading(true)
    setError('')

    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.responsavelEmail,
        password: formData.senha,
        options: {
          data: {
            nome: formData.responsavelNome,
            telefone: formData.responsavelTelefone
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Erro ao criar usuário')

      // 2. Criar clínica via API
      const response = await fetch('/api/clinicas/criar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nomeFantasia: formData.nomeFantasia,
          cnpj: formData.cnpj.replace(/\D/g, ''),
          whatsapp: formData.whatsapp.replace(/\D/g, ''),
          email: formData.email,
          telefone: formData.telefone.replace(/\D/g, ''),
          cidade: formData.cidade,
          estado: formData.estado,
          responsavelNome: formData.responsavelNome,
          responsavelEmail: formData.responsavelEmail,
          responsavelTelefone: formData.responsavelTelefone.replace(/\D/g, ''),
          planoNome: formData.planoSelecionado,
          userId: authData.user.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar clínica')
      }

      // 3. Redirecionar para checkout
      router.push(`/checkout?clinica_id=${result.clinicaId}`)

    } catch (err: any) {
      console.error('Erro no cadastro:', err)
      setError(err.message || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(to bottom right, #f8fafc, #ffffff, rgba(243,232,255,0.3))' }}
    >
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(243,232,255,0.95) 0%, rgba(255,255,255,0.98) 100%)',
              border: '1.5px solid rgba(168,85,247,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(168,85,247,0.15), 0 1px 3px rgba(168,85,247,0.08)',
            }}>
              <ClinixIcon size={22} />
            </div>
            <span className="text-2xl font-bold" style={{ color: 'rgba(18,18,28,0.92)', letterSpacing: '-0.02em' }}>
              CLINIX POWER
            </span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: 'rgba(18,18,28,0.92)', letterSpacing: '-0.04em' }}>
            Comece sua transformação hoje.
          </h1>
          <p style={{ color: 'rgba(18,18,28,0.5)' }}>
            30 dias no modo POWER por apenas R$ 19,90
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-semibold transition"
                style={{
                  background: step >= s ? 'linear-gradient(135deg, #a855f7, #9333ea)' : 'rgba(0,0,0,0.05)',
                  color: step >= s ? 'white' : 'rgba(18,18,28,0.3)',
                  border: step >= s ? 'none' : '1px solid rgba(0,0,0,0.1)'
                }}
              >
                {s}
              </div>
              {s < 3 && (
                <div 
                  className="w-16 md:w-24 h-1 mx-2 transition"
                  style={{
                    background: step > s ? 'linear-gradient(90deg, #a855f7, #9333ea)' : 'rgba(0,0,0,0.08)'
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-8"
          style={{
            background: 'white',
            border: '1px solid rgba(0,0,0,0.07)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
          }}
        >
          <form onSubmit={handleSubmit}>
            {/* Step 1: Dados da Clínica */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6" style={{ color: 'rgba(18,18,28,0.92)', letterSpacing: '-0.03em' }}>Dados da Clínica</h2>
                
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(18,18,28,0.7)' }}>
                    Nome da Clínica *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      name="nomeFantasia"
                      value={formData.nomeFantasia}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-11 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                      placeholder="Ex: Clínica Fisio Saúde"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(18,18,28,0.7)' }}>
                    CNPJ *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      name="cnpj"
                      value={formData.cnpj}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-11 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(18,18,28,0.7)' }}>
                    WhatsApp da Empresa *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="tel"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-11 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                      placeholder="(11) 99999-9999"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(18,18,28,0.7)' }}>
                    Email da Clínica *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-11 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                      placeholder="contato@clinica.com.br"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(18,18,28,0.7)' }}>
                    Telefone *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="tel"
                      name="telefone"
                      value={formData.telefone}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-11 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                      placeholder="(11) 99999-9999"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(18,18,28,0.7)' }}>
                      Cidade *
                    </label>
                    <input
                      type="text"
                      name="cidade"
                      value={formData.cidade}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                      placeholder="Ex: Belo Horizonte"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(18,18,28,0.7)' }}>
                      Estado *
                    </label>
                    <select
                      name="estado"
                      value={formData.estado}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                      required
                    >
                      <option value="">Selecione...</option>
                      <option value="AC">AC</option>
                      <option value="AL">AL</option>
                      <option value="AP">AP</option>
                      <option value="AM">AM</option>
                      <option value="BA">BA</option>
                      <option value="CE">CE</option>
                      <option value="DF">DF</option>
                      <option value="ES">ES</option>
                      <option value="GO">GO</option>
                      <option value="MA">MA</option>
                      <option value="MT">MT</option>
                      <option value="MS">MS</option>
                      <option value="MG">MG</option>
                      <option value="PA">PA</option>
                      <option value="PB">PB</option>
                      <option value="PR">PR</option>
                      <option value="PE">PE</option>
                      <option value="PI">PI</option>
                      <option value="RJ">RJ</option>
                      <option value="RN">RN</option>
                      <option value="RS">RS</option>
                      <option value="RO">RO</option>
                      <option value="RR">RR</option>
                      <option value="SC">SC</option>
                      <option value="SP">SP</option>
                      <option value="SE">SE</option>
                      <option value="TO">TO</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Dados do Responsável */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6" style={{ color: 'rgba(18,18,28,0.92)', letterSpacing: '-0.03em' }}>Dados do Responsável</h2>
                
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(18,18,28,0.7)' }}>
                    Nome Completo *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      name="responsavelNome"
                      value={formData.responsavelNome}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-11 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(18,18,28,0.7)' }}>
                    Email (será seu login) *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="email"
                      name="responsavelEmail"
                      value={formData.responsavelEmail}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-11 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(18,18,28,0.7)' }}>
                    Telefone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="tel"
                      name="responsavelTelefone"
                      value={formData.responsavelTelefone}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-11 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(18,18,28,0.7)' }}>
                    Senha *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="password"
                      name="senha"
                      value={formData.senha}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-11 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(18,18,28,0.7)' }}>
                    Confirmar Senha *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="password"
                      name="confirmarSenha"
                      value={formData.confirmarSenha}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-11 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                      placeholder="Repita a senha"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Escolha do Plano */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6" style={{ color: 'rgba(18,18,28,0.92)', letterSpacing: '-0.03em' }}>Escolha seu Plano</h2>
                
                <div className="grid md:grid-cols-3 gap-4">
                  {planos.map((plano) => (
                    <div
                      key={plano.id}
                      onClick={() => handlePlanoChange(plano.id)}
                      className={`relative cursor-pointer border-2 rounded-xl p-6 transition ${
                        formData.planoSelecionado === plano.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      {plano.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          Popular
                        </div>
                      )}
                      
                      <div className="text-center">
                        <h3 className="text-xl font-bold mb-2" style={{ color: 'rgba(18,18,28,0.92)' }}>{plano.nome}</h3>
                        <div className="mb-4">
                          <span className="text-3xl font-bold" style={{ color: 'rgba(18,18,28,0.92)' }}>R$ {plano.preco}</span>
                          <span className="text-slate-500">/mês</span>
                        </div>
                        <ul className="space-y-2 text-sm" style={{ color: 'rgba(18,18,28,0.7)' }}>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <span>{plano.usuarios} usuários</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <span>{plano.pacientes} pacientes</span>
                          </li>
                        </ul>
                      </div>
                      
                      {formData.planoSelecionado === plano.id && (
                        <div className="absolute top-3 right-3">
                          <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-blue-700 text-sm">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    Após o cadastro, você será direcionado para o pagamento de ativação de <strong>R$ 19,90</strong> e ganhará <strong>30 dias grátis</strong> para testar todas as funcionalidades.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="mt-8 flex gap-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  disabled={loading}
                  className="flex-1 bg-white border border-slate-300 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 transition disabled:opacity-50"
                  style={{ color: 'rgba(18,18,28,0.7)' }}
                >
                  Voltar
                </button>
              )}
              
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition flex items-center justify-center gap-2"
                >
                  Continuar
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    <>
                      Criar Conta e Continuar
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </motion.div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm" style={{ color: 'rgba(18,18,28,0.5)' }}>
            Já tem uma conta?{' '}
            <Link href="/login" className="text-purple-600 hover:text-purple-700 transition font-medium">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
