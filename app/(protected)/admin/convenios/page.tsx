'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Check, Loader2, Pencil, Plus, Tag, ToggleLeft, ToggleRight, X } from 'lucide-react'

type Convenio = {
  id: string
  nome: string
  valor_sessao: number
  cor: string
  ativo: boolean
  is_padrao: boolean
  clinica_id: string
}

const COR_OPCOES = [
  { label: 'Roxo', value: '#a855f7' },
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Verde', value: '#22c55e' },
  { label: 'Laranja', value: '#f97316' },
  { label: 'Rosa', value: '#ec4899' },
  { label: 'Ciano', value: '#06b6d4' },
]

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ConveniosPage() {
  const [lista, setLista] = useState<Convenio[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const clinicaIdRef = useRef<string | null>(null)

  // Inline edit
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editValor, setEditValor] = useState('')
  const [editNome, setEditNome] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  // Modal novo
  const [modalOpen, setModalOpen] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoValor, setNovoValor] = useState('')
  const [novoCor, setNovoCor] = useState('#a855f7')
  const [criando, setCriando] = useState(false)
  const [modalErro, setModalErro] = useState<string | null>(null)

  async function loadClinicaId() {
    if (clinicaIdRef.current) return clinicaIdRef.current
    const { data: s } = await supabase.auth.getSession()
    const userId = s.session?.user?.id
    if (!userId) return null
    const { data: prof } = await supabase.from('profiles').select('clinica_id').eq('id', userId).single()
    if (prof?.clinica_id) clinicaIdRef.current = prof.clinica_id
    return prof?.clinica_id ?? null
  }

  async function load() {
    setLoading(true)
    setErro(null)
    try {
      const clinicaId = await loadClinicaId()
      if (!clinicaId) throw new Error('Clínica não encontrada.')
      const { data, error } = await supabase
        .from('convenios')
        .select('*')
        .eq('clinica_id', clinicaId)
        .order('is_padrao', { ascending: false })
        .order('nome', { ascending: true })
      if (error) throw error
      setLista((data || []) as Convenio[])
    } catch (e: any) {
      setErro(e?.message || 'Erro ao carregar convênios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function startEdit(c: Convenio) {
    setEditandoId(c.id)
    setEditNome(c.nome)
    setEditValor(String(c.valor_sessao))
  }

  function cancelEdit() {
    setEditandoId(null)
    setEditNome('')
    setEditValor('')
  }

  async function salvarInline(c: Convenio) {
    setSavingId(c.id)
    try {
      const valor = parseFloat(editValor.replace(',', '.')) || 0
      const { error } = await supabase
        .from('convenios')
        .update({ nome: editNome.trim() || c.nome, valor_sessao: valor, updated_at: new Date().toISOString() })
        .eq('id', c.id)
      if (error) throw error
      setEditandoId(null)
      await load()
    } catch (e: any) {
      alert('Erro ao salvar: ' + e?.message)
    } finally {
      setSavingId(null)
    }
  }

  async function toggleAtivo(c: Convenio) {
    setSavingId(c.id)
    try {
      const { error } = await supabase
        .from('convenios')
        .update({ ativo: !c.ativo, updated_at: new Date().toISOString() })
        .eq('id', c.id)
      if (error) throw error
      setLista(prev => prev.map(x => x.id === c.id ? { ...x, ativo: !c.ativo } : x))
    } catch (e: any) {
      alert('Erro: ' + e?.message)
    } finally {
      setSavingId(null)
    }
  }

  async function deletar(c: Convenio) {
    if (c.is_padrao) return
    if (!confirm(`Excluir o convênio "${c.nome}"? Esta ação não pode ser desfeita.`)) return
    try {
      const { error } = await supabase.from('convenios').delete().eq('id', c.id)
      if (error) throw error
      await load()
    } catch (e: any) {
      alert('Erro ao excluir: ' + e?.message)
    }
  }

  async function criarConvenio() {
    setModalErro(null)
    if (!novoNome.trim()) { setModalErro('Nome é obrigatório.'); return }
    setCriando(true)
    try {
      const clinicaId = await loadClinicaId()
      if (!clinicaId) throw new Error('Clínica não encontrada.')
      const valor = parseFloat(novoValor.replace(',', '.')) || 0
      const { error } = await supabase.from('convenios').insert({
        clinica_id: clinicaId,
        nome: novoNome.trim(),
        valor_sessao: valor,
        cor: novoCor,
        ativo: true,
        is_padrao: false,
      })
      if (error) throw error
      setModalOpen(false)
      setNovoNome('')
      setNovoValor('')
      setNovoCor('#a855f7')
      await load()
    } catch (e: any) {
      setModalErro(e?.message || 'Erro ao criar convênio.')
    } finally {
      setCriando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* HEADER */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-400/30">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Convênios</h1>
              <p className="text-xs text-slate-500">Gerencie planos e valores por sessão</p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-semibold shadow-lg shadow-purple-400/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Novo Convênio
          </button>
        </div>

        {/* ERRO */}
        {erro && (
          <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
            {erro}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Carregando convênios...</span>
          </div>
        )}

        {/* LISTA */}
        {!loading && (
          <div className="space-y-3">
            {lista.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                <Tag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-600">Nenhum convênio cadastrado</p>
                <p className="text-xs text-slate-400 mt-1">Clique em "Novo Convênio" para começar</p>
              </div>
            )}

            {lista.map((c) => (
              <div
                key={c.id}
                className={`relative bg-white/80 backdrop-blur-sm rounded-2xl border shadow-sm transition-all duration-200 ${
                  c.ativo
                    ? 'border-slate-200/80 hover:border-purple-200/60 hover:shadow-md'
                    : 'border-slate-100 opacity-60'
                }`}
                style={{
                  boxShadow: c.ativo ? `0 0 0 1px ${c.cor}18, 0 2px 8px rgba(0,0,0,0.04)` : undefined,
                }}
              >
                <div className="p-5">
                  <div className="flex items-center gap-4">
                    {/* COR */}
                    <div
                      className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: c.cor + '22', border: `2px solid ${c.cor}44` }}
                    >
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.cor }} />
                    </div>

                    {/* NOME + VALOR */}
                    <div className="flex-1 min-w-0">
                      {editandoId === c.id ? (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            value={editNome}
                            onChange={e => setEditNome(e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-purple-200 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-purple-300/60 bg-white"
                            placeholder="Nome do convênio"
                          />
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">R$</span>
                            <input
                              value={editValor}
                              onChange={e => setEditValor(e.target.value)}
                              className="w-32 pl-8 pr-3 py-1.5 rounded-lg border border-purple-200 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-purple-300/60 bg-white"
                              placeholder="0,00"
                              inputMode="decimal"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">{c.nome}</span>
                          {c.is_padrao && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                              Padrão
                            </span>
                          )}
                          {!c.ativo && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Inativo
                            </span>
                          )}
                        </div>
                      )}
                      {editandoId !== c.id && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-700">{fmtBRL(c.valor_sessao)}</span>
                          {' '}por mês
                        </p>
                      )}
                    </div>

                    {/* ACTIONS */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {editandoId === c.id ? (
                        <>
                          <button
                            onClick={() => salvarInline(c)}
                            disabled={savingId === c.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all disabled:opacity-50"
                          >
                            {savingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Salvar
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Toggle ativo */}
                          <button
                            onClick={() => toggleAtivo(c)}
                            disabled={savingId === c.id}
                            className="disabled:opacity-50"
                            title={c.ativo ? 'Desativar' : 'Ativar'}
                          >
                            {c.ativo
                              ? <ToggleRight className="w-7 h-7 text-emerald-500" />
                              : <ToggleLeft className="w-7 h-7 text-slate-400" />}
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => startEdit(c)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-purple-50 hover:border-purple-200 text-slate-500 hover:text-purple-600 transition-all"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Deletar (não padrão) */}
                          {!c.is_padrao && (
                            <button
                              onClick={() => deletar(c)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-500 transition-all"
                              title="Excluir"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL NOVO CONVÊNIO */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onMouseDown={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-white">
              <div>
                <h3 className="text-base font-bold text-slate-900">Novo Convênio</h3>
                <p className="text-xs text-slate-500 mt-0.5">Adicione um novo plano ou convênio</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {modalErro && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {modalErro}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nome do convênio *</label>
                <input
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-300/60 focus:border-purple-300 transition-all"
                  placeholder="Ex: Bradesco Saúde, SulAmérica..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Valor mensal (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">R$</span>
                  <input
                    value={novoValor}
                    onChange={e => setNovoValor(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-300/60 focus:border-purple-300 transition-all"
                    placeholder="Ex: 350,00"
                    inputMode="decimal"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Valor mensal cobrado por este convênio</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Cor de identificação</label>
                <div className="flex gap-2 flex-wrap">
                  {COR_OPCOES.map(op => (
                    <button
                      key={op.value}
                      onClick={() => setNovoCor(op.value)}
                      className={`w-9 h-9 rounded-xl transition-all ${novoCor === op.value ? 'ring-2 ring-offset-2 ring-purple-400 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: op.value }}
                      title={op.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 bg-slate-50/50">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={criarConvenio}
                disabled={criando}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-semibold shadow-lg shadow-purple-400/30 transition-all disabled:opacity-50 active:scale-95"
              >
                {criando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {criando ? 'Criando...' : 'Criar Convênio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
