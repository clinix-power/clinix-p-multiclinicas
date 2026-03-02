'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import PageHeader from '@/components/ui/page-header'
import { Users, Trash2 } from 'lucide-react'

type CreateFuncionarioPayload = {
  nome: string
  email: string
  password: string
  profissao: string
  registro_tipo: string
  registro_numero: string
}

type ProfissionalRow = {
  id: string
  nome?: string | null
  email?: string | null
  role?: string | null
  is_active?: boolean | null
  profissao?: string | null
  registro_tipo?: string | null
  registro_numero?: string | null
}

type Tab = 'LISTA' | 'NOVO' | 'EDITAR'
type FiltroAtivo = 'TODOS' | 'ATIVOS' | 'INATIVOS'

// Ícones SVG inline (minimalistas)
const UserIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const StethoscopeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const ShieldIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

const RefreshIcon = ({ className = "w-5 h-5", spin = false }: { className?: string; spin?: boolean }) => (
  <svg className={`${className} ${spin ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const PlusIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
)

const SearchIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const XIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

export default function ProfissionaisPage() {
  // Tabs
  const [tab, setTab] = useState<Tab>('LISTA')

  // Lista
  const [loadingList, setLoadingList] = useState(true)
  const [refreshingList, setRefreshingList] = useState(false)
  const [listErr, setListErr] = useState<string | null>(null)
  const [profissionais, setProfissionais] = useState<ProfissionalRow[]>([])
  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroAtivo>('ATIVOS')

  // Form (cadastro)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  const [profissao, setProfissao] = useState('')
  const [registroTipo, setRegistroTipo] = useState('CREFITO')
  const [registroNumero, setRegistroNumero] = useState('')

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [modoEdicao, setModoEdicao] = useState(false)

  const assinaturaPreview = useMemo(() => {
    const partes: string[] = []
    if (nome.trim()) partes.push(nome.trim())
    if (profissao.trim()) partes.push(profissao.trim())
    const reg = [registroTipo.trim(), registroNumero.trim()].filter(Boolean).join(' ')
    if (reg) partes.push(reg)
    return partes.join(' • ')
  }, [nome, profissao, registroTipo, registroNumero])

  function limparForm() {
    setErr(null)
    setMsg(null)
    setNome('')
    setEmail('')
    setSenha('')
    setProfissao('')
    setRegistroTipo('CREFITO')
    setRegistroNumero('')
    setModoEdicao(false)
    setEditandoId(null)
  }

  // ✅ Lista blindada (não quebra se algum campo não existir)
  async function loadProfissionais(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false
    if (!silent) setLoadingList(true)
    else setRefreshingList(true)

    setListErr(null)

    try {
      // Obter clinica_id do perfil autenticado para isolamento multiclínica
      const { data: s } = await supabase.auth.getSession()
      const userId = s.session?.user?.id
      if (!userId) throw new Error('Sessão expirada.')

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('clinica_id')
        .eq('id', userId)
        .single()
      if (!myProfile?.clinica_id) throw new Error('Clínica não encontrada no perfil.')
      const clinicaId = myProfile.clinica_id

      // Tentativa 1: campos completos (se existir tudo)
      const tryFull = await supabase
        .from('profiles')
        .select('id,nome,email,role,is_active,profissao,registro_tipo,registro_numero')
        .eq('clinica_id', clinicaId)
        .neq('is_master_admin', true)
        .in('role', ['FUNCIONARIO', 'ADMIN'])
        .order('nome', { ascending: true })

      if (!tryFull.error) {
        setProfissionais((tryFull.data ?? []) as ProfissionalRow[])
      } else {
        // Tentativa 2 (fallback): campos mínimos (quase sempre existem)
        const tryMin = await supabase
          .from('profiles')
          .select('id,nome,role,is_active')
          .eq('clinica_id', clinicaId)
          .neq('is_master_admin', true)
          .in('role', ['FUNCIONARIO', 'ADMIN'])
          .order('nome', { ascending: true })

        if (tryMin.error) throw tryMin.error
        setProfissionais((tryMin.data ?? []) as ProfissionalRow[])
      }
    } catch (e: any) {
      console.error('[profissionais] load error', e)
      setListErr('Erro ao carregar profissionais.')
      setProfissionais([])
    } finally {
      if (!silent) setLoadingList(false)
      setRefreshingList(false)
    }
  }

  useEffect(() => {
    loadProfissionais()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const profissionaisFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase()

    return (profissionais ?? [])
      .filter((p) => {
        const ativo = p.is_active !== false // null/undefined conta como ativo (não quebra)
        if (filtroAtivo === 'ATIVOS' && !ativo) return false
        if (filtroAtivo === 'INATIVOS' && ativo) return false

        if (q) {
          const nomeL = String(p.nome ?? '').toLowerCase()
          const emailL = String(p.email ?? '').toLowerCase()
          const profL = String(p.profissao ?? '').toLowerCase()
          if (!nomeL.includes(q) && !emailL.includes(q) && !profL.includes(q)) return false
        }

        return true
      })
      .sort((a, b) => String(a.nome ?? '').localeCompare(String(b.nome ?? '')))
  }, [profissionais, busca, filtroAtivo])

  async function deletarProfissional(id: string, nome: string) {
    const confirmacao = window.confirm(
      `Tem certeza que deseja excluir ${nome || 'este profissional'}?\n\nEsta ação não pode ser desfeita.`
    )

    if (!confirmacao) return

    setDeletingId(id)
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Remove da lista local imediatamente
      setProfissionais((prev) => prev.filter((p) => p.id !== id))
    } catch (error: any) {
      console.error('[delete-profissional] erro', error)
      alert('Erro ao excluir profissional: ' + (error?.message || 'Erro desconhecido'))
    } finally {
      setDeletingId(null)
    }
  }

  function iniciarEdicao(prof: ProfissionalRow) {
    setEditandoId(prof.id)
    setModoEdicao(true)
    setNome(prof.nome || '')
    setEmail(prof.email || '')
    setSenha('') // Senha vazia (não será alterada na edição)
    setProfissao(prof.profissao || '')
    setRegistroTipo(prof.registro_tipo || 'CREFITO')
    setRegistroNumero(prof.registro_numero || '')
    setTab('EDITAR')
    setErr(null)
    setMsg(null)
  }

  async function atualizarProfissional(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    setLoading(true)

    try {
      if (!editandoId) {
        setErr('ID do profissional não encontrado.')
        setLoading(false)
        return
      }

      const updates: any = {
        nome: nome.trim(),
        profissao: profissao.trim(),
        registro_tipo: registroTipo.trim(),
        registro_numero: registroNumero.trim(),
      }

      // Email só atualiza se mudou (evita conflitos de unique constraint)
      const profAtual = profissionais.find(p => p.id === editandoId)
      if (email.trim().toLowerCase() !== profAtual?.email?.toLowerCase()) {
        updates.email = email.trim().toLowerCase()
      }

      // Validações
      if (!updates.nome || !updates.profissao) {
        setErr('Preencha nome e profissão.')
        setLoading(false)
        return
      }

      if (!updates.registro_tipo || !updates.registro_numero) {
        setErr('Preencha tipo e número do registro profissional.')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', editandoId)

      if (error) throw error

      setMsg('Profissional atualizado com sucesso!')
      limparForm()
      
      await loadProfissionais({ silent: true })
      setTab('LISTA')
    } catch (error: any) {
      console.error('[update-profissional] erro', error)
      setErr(error?.message || 'Erro ao atualizar profissional.')
    } finally {
      setLoading(false)
    }
  }

  async function criarFuncionario(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    setLoading(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token

      if (!accessToken) {
        setErr('Sessão expirada. Faça login novamente como ADMIN.')
        setLoading(false)
        return
      }

      const body: CreateFuncionarioPayload = {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        password: senha,
        profissao: profissao.trim(),
        registro_tipo: registroTipo.trim(),
        registro_numero: registroNumero.trim(),
      }

      if (!body.nome || !body.email || !body.password) {
        setErr('Preencha nome, e-mail e senha.')
        setLoading(false)
        return
      }
      if (body.password.length < 8) {
        setErr('A senha inicial deve ter pelo menos 8 caracteres.')
        setLoading(false)
        return
      }
      if (!body.profissao) {
        setErr('Preencha a profissão do funcionário.')
        setLoading(false)
        return
      }
      if (!body.registro_tipo) {
        setErr('Preencha o tipo de registro (ex: CREFITO).')
        setLoading(false)
        return
      }
      if (!body.registro_numero) {
        setErr('Preencha o número do registro (ex: 12345-F).')
        setLoading(false)
        return
      }

      const res = await fetch('/api/create-funcionario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`)
      if (data?.error) throw new Error(data.error)

      setMsg('Funcionário criado com sucesso!')
      limparForm()

      // ✅ Atualiza lista e volta para LISTA (sem quebrar fluxo)
      await loadProfissionais({ silent: true })
      setTab('LISTA')
    } catch (error: any) {
      console.error('[create-funcionario] erro inesperado', error)
      const message = error?.message || 'Erro inesperado ao comunicar com a Edge Function.'
      setErr(message)
    } finally {
      setLoading(false)
    }
  }

  // UI classes (MÉTODO CLINIX 2026)
  const inputClass =
    'mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ' +
    'placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all'

  const selectClass =
    'mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ' +
    'focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all'

  const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider'
  const helperClass = 'text-xs text-slate-500 mt-1.5'

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <PageHeader
          icon={Users}
          title="Profissionais"
          subtitle="Gerencie a equipe e acessos"
        />

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setTab('LISTA')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'LISTA'
                ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            Lista
          </button>

          <button
            type="button"
            onClick={() => setTab('NOVO')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-semibold shadow-lg shadow-purple-400/30 hover:shadow-xl hover:shadow-purple-400/40 transition-all active:scale-95"
          >
            <PlusIcon className="w-4 h-4" />
            Novo profissional
          </button>
        </div>

        {/* LISTA */}
        {tab === 'LISTA' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Filtros e Busca */}
            <div className="p-5 border-b border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StethoscopeIcon className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-semibold text-slate-900">Equipe cadastrada</span>
                </div>

                <button
                  type="button"
                  onClick={() => loadProfissionais({ silent: true })}
                  disabled={refreshingList}
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <RefreshIcon className="w-3.5 h-3.5" spin={refreshingList} />
                  {refreshingList ? 'Atualizando...' : 'Atualizar'}
                </button>
              </div>

              {listErr && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {listErr}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Busca */}
                <div className="lg:col-span-2">
                  <label className={labelClass}>Buscar profissional</label>
                  <div className="relative mt-2">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                      placeholder="Nome, e-mail ou profissão..."
                    />
                  </div>
                </div>

                {/* Filtro Status */}
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={filtroAtivo}
                    onChange={(e) => setFiltroAtivo(e.target.value as FiltroAtivo)}
                    className={selectClass}
                  >
                    <option value="ATIVOS">Ativos</option>
                    <option value="INATIVOS">Inativos</option>
                    <option value="TODOS">Todos</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Lista de Profissionais */}
            <div className="p-5">
              {loadingList ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl p-4 border border-slate-100 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-slate-200 rounded w-1/3" />
                          <div className="h-3 bg-slate-200 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : profissionaisFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-4">
                    <UserIcon className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-1">Nenhum profissional encontrado</p>
                  <p className="text-xs text-slate-500">Ajuste os filtros ou cadastre um novo profissional</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profissionaisFiltrados.map((p) => {
                    const ativo = p.is_active !== false
                    const reg = [p.registro_tipo, p.registro_numero].filter(Boolean).join(' ')
                    const linha2 = [p.profissao, reg].filter(Boolean).join(' • ')

                    return (
                      <div
                        key={p.id}
                        className="group relative bg-white rounded-2xl p-5 shadow-sm hover:shadow-md border border-slate-100 hover:border-purple-200 hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <div className="flex items-start gap-4">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => iniciarEdicao(p)}
                            className="absolute bottom-2 right-12 p-1.5 rounded-lg text-slate-400 hover:text-purple-500 hover:bg-purple-50 transition-all z-10"
                            title="Editar profissional"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Delete Button - Reposicionado para canto inferior direito */}
                          <button
                            type="button"
                            onClick={() => deletarProfissional(p.id, p.nome || 'Profissional')}
                            disabled={deletingId === p.id}
                            className="absolute bottom-2 right-2 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed z-10"
                            title="Excluir profissional"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* Avatar */}
                          <div className="shrink-0 w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                            {p.role === 'ADMIN' ? (
                              <ShieldIcon className="w-6 h-6 text-purple-500" />
                            ) : (
                              <UserIcon className="w-6 h-6 text-purple-500" />
                            )}
                          </div>

                          {/* Informações */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-semibold text-slate-900 truncate">
                                  {p.nome || 'Profissional'}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    {p.role === 'ADMIN' ? 'Administrador' : 'Funcionário'}
                                  </span>
                                </div>
                              </div>

                              {/* Badge Status */}
                              {ativo ? (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 shrink-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Ativo</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 shrink-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Inativo</span>
                                </div>
                              )}
                            </div>

                            {/* E-mail */}
                            {p.email && (
                              <div className="mt-2 text-xs text-slate-600 truncate">
                                {p.email}
                              </div>
                            )}

                            {/* Profissão e Registro */}
                            {linha2 && (
                              <div className="mt-1 text-xs text-slate-500 truncate">
                                {linha2}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Rodapé */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Total: <span className="font-semibold text-slate-700">{profissionaisFiltrados.length}</span> profissionais
                </span>
                <button
                  type="button"
                  onClick={() => setTab('NOVO')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-semibold shadow-lg shadow-purple-400/30 hover:shadow-xl hover:shadow-purple-400/40 transition-all active:scale-95"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Cadastrar novo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NOVO */}
        {tab === 'NOVO' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Novo funcionário</div>
                <div className="text-xs text-slate-500 mt-1">
                  Defina uma senha inicial e cadastre os dados profissionais do colaborador
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTab('LISTA')
                  setErr(null)
                  setMsg(null)
                }}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold transition-all active:scale-95"
              >
                <XIcon className="w-3.5 h-3.5" />
                Voltar
              </button>
            </div>

            <form onSubmit={criarFuncionario} className="p-6 space-y-6">
              {err && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {err}
                </div>
              )}

              {msg && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {msg}
                </div>
              )}

              {/* Section: Dados de Acesso */}
              <div className="relative pl-4 border-l-2 border-purple-500 bg-purple-50/30 rounded-r-xl p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-4">Dados de Acesso</div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className={labelClass}>Nome completo</label>
                    <input
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className={inputClass}
                      placeholder="Ex: Ana Ottoni"
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      placeholder="Ex: ana@clinica.com"
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Senha inicial</label>
                    <input
                      type="password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className={inputClass}
                      placeholder="Mínimo 8 caracteres"
                      required
                      minLength={8}
                    />
                    <p className={helperClass}>
                      O funcionário poderá trocar a senha em <span className="font-medium text-slate-700">Meu perfil</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Section: Identidade Profissional */}
              <div className="relative pl-4 border-l-2 border-purple-500 bg-purple-50/30 rounded-r-xl p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-4">Identidade Profissional</div>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Profissão</label>
                    <input
                      value={profissao}
                      onChange={(e) => setProfissao(e.target.value)}
                      className={inputClass}
                      placeholder="Ex: Fisioterapeuta"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Tipo de registro</label>
                      <input
                        value={registroTipo}
                        onChange={(e) => setRegistroTipo(e.target.value)}
                        className={inputClass}
                        placeholder="Ex: CREFITO"
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Número do registro</label>
                      <input
                        value={registroNumero}
                        onChange={(e) => setRegistroNumero(e.target.value)}
                        className={inputClass}
                        placeholder="Ex: 12345-F"
                        required
                      />
                    </div>
                  </div>

                  {/* Prévia do Carimbo */}
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Prévia do carimbo
                    </div>
                    <div className="text-sm font-medium text-slate-900">
                      {assinaturaPreview || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-semibold shadow-lg shadow-purple-400/30 hover:shadow-xl hover:shadow-purple-400/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {loading ? (
                    <>
                      <RefreshIcon className="w-4 h-4" spin />
                      Criando...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="w-4 h-4" />
                      Criar funcionário
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={limparForm}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  Limpar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* EDITAR */}
        {tab === 'EDITAR' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Editar profissional</div>
                <div className="text-xs text-slate-500 mt-1">
                  Atualize os dados profissionais do colaborador
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTab('LISTA')
                  limparForm()
                }}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold transition-all active:scale-95"
              >
                <XIcon className="w-3.5 h-3.5" />
                Cancelar
              </button>
            </div>

            <form onSubmit={atualizarProfissional} className="p-6 space-y-6">
              {err && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {err}
                </div>
              )}

              {msg && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {msg}
                </div>
              )}

              {/* Section: Dados de Acesso */}
              <div className="relative pl-4 border-l-2 border-purple-500 bg-purple-50/30 rounded-r-xl p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-4">Dados de Acesso</div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className={labelClass}>Nome completo</label>
                    <input
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className={inputClass}
                      placeholder="Ex: Ana Ottoni"
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      placeholder="Ex: ana@clinica.com"
                      required
                    />
                    <p className={helperClass}>
                      O e-mail só será atualizado se for diferente do atual
                    </p>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="text-xs text-amber-800">
                        <span className="font-semibold">Senha não pode ser alterada aqui.</span> O profissional deve trocar a senha em <span className="font-medium">Meu perfil</span>.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Identidade Profissional */}
              <div className="relative pl-4 border-l-2 border-purple-500 bg-purple-50/30 rounded-r-xl p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-4">Identidade Profissional</div>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Profissão</label>
                    <input
                      value={profissao}
                      onChange={(e) => setProfissao(e.target.value)}
                      className={inputClass}
                      placeholder="Ex: Fisioterapeuta"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Tipo de registro</label>
                      <input
                        value={registroTipo}
                        onChange={(e) => setRegistroTipo(e.target.value)}
                        className={inputClass}
                        placeholder="Ex: CREFITO"
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Número do registro</label>
                      <input
                        value={registroNumero}
                        onChange={(e) => setRegistroNumero(e.target.value)}
                        className={inputClass}
                        placeholder="Ex: 12345-F"
                        required
                      />
                    </div>
                  </div>

                  {/* Prévia do Carimbo */}
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Prévia do carimbo
                    </div>
                    <div className="text-sm font-medium text-slate-900">
                      {assinaturaPreview || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-semibold shadow-lg shadow-purple-400/30 hover:shadow-xl hover:shadow-purple-400/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {loading ? (
                    <>
                      <RefreshIcon className="w-4 h-4" spin />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Salvar alterações
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setTab('LISTA')
                    limparForm()
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
