'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { X, Building2, MapPin, User, FileText } from 'lucide-react'

type ConfiguracaoClinica = {
  id?: string
  clinica_id?: string
  nome_fantasia: string
  endereco_completo: string
  responsavel_tecnico: string
  documento_responsavel: string
  tipo_documento: 'CPF' | 'CNPJ' | 'RG'
}

type ConfiguracaoClinicaModalProps = {
  isOpen: boolean
  onClose: () => void
  onSave: (config: ConfiguracaoClinica) => void
}

export default function ConfiguracaoClinicaModal({ isOpen, onClose, onSave }: ConfiguracaoClinicaModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [form, setForm] = useState<ConfiguracaoClinica>({
    nome_fantasia: '',
    endereco_completo: '',
    responsavel_tecnico: '',
    documento_responsavel: '',
    tipo_documento: 'CPF',
  })

  useEffect(() => {
    if (isOpen) {
      loadConfiguracao()
    }
  }, [isOpen])

  async function loadConfiguracao() {
    setLoading(true)
    setError(null)

    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) { setLoading(false); return }

      const { data: myProfile } = await supabase
        .from('profiles').select('clinica_id').eq('id', userId).single()
      const clinicaId = myProfile?.clinica_id

      let q = supabase.from('configuracoes_clinica').select('*').limit(1)
      if (clinicaId) q = (q as any).eq('clinica_id', clinicaId)
      const { data, error: fetchError } = await q.single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      if (data) {
        setForm({
          id: data.id,
          clinica_id: data.clinica_id,
          nome_fantasia: data.nome_fantasia,
          endereco_completo: data.endereco_completo,
          responsavel_tecnico: data.responsavel_tecnico,
          documento_responsavel: data.documento_responsavel,
          tipo_documento: data.tipo_documento,
        })
      } else if (clinicaId) {
        setForm(prev => ({ ...prev, clinica_id: clinicaId }))
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar configuração')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!form.nome_fantasia || !form.endereco_completo || !form.responsavel_tecnico || !form.documento_responsavel) {
      setError('Preencha todos os campos obrigatórios')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (form.id) {
        const { error: updateError } = await supabase
          .from('configuracoes_clinica')
          .update({
            nome_fantasia: form.nome_fantasia,
            endereco_completo: form.endereco_completo,
            responsavel_tecnico: form.responsavel_tecnico,
            documento_responsavel: form.documento_responsavel,
            tipo_documento: form.tipo_documento,
          })
          .eq('id', form.id)

        if (updateError) throw updateError
      } else {
        const insertPayload: any = {
          nome_fantasia: form.nome_fantasia,
          endereco_completo: form.endereco_completo,
          responsavel_tecnico: form.responsavel_tecnico,
          documento_responsavel: form.documento_responsavel,
          tipo_documento: form.tipo_documento,
        }
        if (form.clinica_id) insertPayload.clinica_id = form.clinica_id

        const { error: insertError } = await supabase
          .from('configuracoes_clinica')
          .insert(insertPayload)

        if (insertError) throw insertError
      }

      onSave(form)
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar configuração')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
      <div className="relative w-full max-w-2xl mx-4 bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.12)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Configuração do Documento</h2>
              <p className="text-sm text-slate-600 mt-1">Dados da clínica para geração de laudos</p>
            </div>
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition"
            >
              <X className="h-5 w-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-r-transparent"></div>
              <p className="mt-3 text-sm text-slate-600">Carregando...</p>
            </div>
          ) : (
            <>
              {/* Nome Fantasia */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Building2 className="h-4 w-4 text-purple-600" />
                  Nome Fantasia da Clínica
                </label>
                <input
                  type="text"
                  value={form.nome_fantasia}
                  onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                  className="w-full h-11 px-4 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: Clínica Fisio Saúde"
                />
              </div>

              {/* Endereço Completo */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <MapPin className="h-4 w-4 text-purple-600" />
                  Endereço Completo
                </label>
                <textarea
                  value={form.endereco_completo}
                  onChange={(e) => setForm({ ...form, endereco_completo: e.target.value })}
                  className="w-full h-24 px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  placeholder="Rua, número, bairro, cidade - UF, CEP"
                />
              </div>

              {/* Responsável Técnico */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <User className="h-4 w-4 text-purple-600" />
                  Responsável Técnico
                </label>
                <input
                  type="text"
                  value={form.responsavel_tecnico}
                  onChange={(e) => setForm({ ...form, responsavel_tecnico: e.target.value })}
                  className="w-full h-11 px-4 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Nome completo do responsável técnico"
                />
              </div>

              {/* Tipo de Documento */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  Tipo de Documento
                </label>
                <select
                  value={form.tipo_documento}
                  onChange={(e) => setForm({ ...form, tipo_documento: e.target.value as 'CPF' | 'CNPJ' | 'RG' })}
                  className="w-full h-11 px-4 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="RG">RG</option>
                </select>
              </div>

              {/* Documento do Responsável */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  Número do Documento
                </label>
                <input
                  type="text"
                  value={form.documento_responsavel}
                  onChange={(e) => setForm({ ...form, documento_responsavel: e.target.value })}
                  className="w-full h-11 px-4 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="000.000.000-00"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-slate-200/60 px-6 py-4 rounded-b-3xl">
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={onClose}
              className="h-11 px-6 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="h-11 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium shadow-lg shadow-purple-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
