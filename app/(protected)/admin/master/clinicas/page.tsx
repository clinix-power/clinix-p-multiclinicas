'use client'

import { useEffect, useState } from 'react'
import { supabase, ensureValidSession } from '@/lib/supabaseClient'
import MasterAdminGate from '@/components/MasterAdminGate'
import PageHeader from '@/components/ui/page-header'
import { Building2, Users, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react'

type Clinica = {
  id: string
  nome_fantasia: string
  email: string
  status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'
  data_cadastro: string
  data_ativacao: string | null
  data_expiracao_trial: string | null
  assinatura_ativa: boolean
  assinatura_vencimento: string | null
  plano_nome: string
  plano_valor: number
  total_usuarios: number
  total_pacientes: number
  total_evolucoes: number
}

type Metricas = {
  total_clinicas: number
  clinicas_trial: number
  clinicas_ativas: number
  clinicas_suspensas: number
  clinicas_canceladas: number
  total_usuarios: number
  total_pacientes: number
  receita_ativacao: number
  receita_assinaturas: number
  cadastros_ultimos_30_dias: number
  total_evolucoes: number
}

export default function MasterAdminClinicasPage() {
  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setError(null)

    try {
      const user = await ensureValidSession()
      if (!user) throw new Error('Sessão inválida')

      // Carregar métricas
      const { data: metricasData, error: metricasError } = await supabase
        .from('saas_metricas')
        .select('*')
        .single()

      if (metricasError) throw metricasError

      setMetricas(metricasData as Metricas)

      // Carregar clínicas
      const { data: clinicasData, error: clinicasError } = await supabase
        .from('saas_clinicas_detalhes')
        .select('*')
        .order('data_cadastro', { ascending: false })

      if (clinicasError) throw clinicasError

      setClinicas(clinicasData as Clinica[])
    } catch (err: any) {
      console.error('[MasterAdmin] Erro ao carregar dados:', err)
      setError(err.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData(false)
  }, [])

  function formatCurrency(value: number | null) {
    if (!value) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  function formatDate(date: string | null) {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  function getStatusBadge(status: string) {
    const styles = {
      TRIAL: 'bg-blue-100 text-blue-700 border-blue-200',
      ACTIVE: 'bg-green-100 text-green-700 border-green-200',
      SUSPENDED: 'bg-orange-100 text-orange-700 border-orange-200',
      CANCELLED: 'bg-red-100 text-red-700 border-red-200',
    }

    const labels = {
      TRIAL: 'Trial',
      ACTIVE: 'Ativa',
      SUSPENDED: 'Suspensa',
      CANCELLED: 'Cancelada',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  return (
    <MasterAdminGate>
      <div className="min-h-screen bg-[#F1F5F9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <PageHeader
            icon={Building2}
            title="Master Admin - Clínicas"
            subtitle="Visão completa do SaaS multiclínicas"
            badge={{ text: 'Super Admin', variant: 'success' }}
          />

          {/* Botão Atualizar */}
          <div className="flex items-center justify-end gap-3 mb-6">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando' : 'Atualizar'}
            </button>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-100">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-rose-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
                  <div className="h-4 w-20 bg-slate-100 rounded mb-3" />
                  <div className="h-8 w-16 bg-slate-100 rounded mb-2" />
                  <div className="h-3 w-24 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : metricas ? (
            <>
              {/* Cards de Métricas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Clínicas</span>
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{metricas.total_clinicas}</div>
                  <p className="text-xs text-slate-600 mt-1">
                    {metricas.cadastros_ultimos_30_dias} nos últimos 30 dias
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ativas</span>
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{metricas.clinicas_ativas}</div>
                  <p className="text-xs text-slate-600 mt-1">
                    {metricas.clinicas_trial} em trial
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Usuários</span>
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{metricas.total_usuarios}</div>
                  <p className="text-xs text-slate-600 mt-1">
                    {metricas.total_pacientes} pacientes
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Receita</span>
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">
                    {formatCurrency((metricas.receita_ativacao || 0) + (metricas.receita_assinaturas || 0))}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Total acumulado
                  </p>
                </div>
              </div>

              {/* Tabela de Clínicas */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Todas as Clínicas</h3>
                  <p className="text-xs text-slate-600 mt-0.5">Listagem completa com detalhes</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Clínica
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Plano
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Cadastro
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Usuários
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Pacientes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clinicas.map((clinica) => (
                        <tr key={clinica.id} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{clinica.nome_fantasia}</div>
                              <div className="text-xs text-slate-600">{clinica.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(clinica.status)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-slate-900">{clinica.plano_nome}</div>
                            <div className="text-xs text-slate-600">{formatCurrency(clinica.plano_valor)}/mês</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-900">{formatDate(clinica.data_cadastro)}</div>
                            {clinica.data_expiracao_trial && (
                              <div className="text-xs text-slate-600">Trial até {formatDate(clinica.data_expiracao_trial)}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-slate-900">{clinica.total_usuarios}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-slate-900">{clinica.total_pacientes}</div>
                            <div className="text-xs text-slate-600">{clinica.total_evolucoes} evoluções</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {clinicas.length === 0 && (
                    <div className="px-6 py-12 text-center">
                      <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-600">Nenhuma clínica cadastrada ainda</p>
                      <p className="text-xs text-slate-500 mt-1">As clínicas aparecerão aqui quando forem criadas</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </MasterAdminGate>
  )
}
