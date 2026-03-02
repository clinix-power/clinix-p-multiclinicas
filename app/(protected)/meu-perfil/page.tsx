'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { User, Mail, Camera, Lock, CheckCircle2, AlertCircle, ClipboardList, Calendar } from 'lucide-react'
import PageHeader from '@/components/ui/page-header'

/** Polimento Max — bolinhas (mesmo timing/sensação da Agenda Polimento Max) */
function AnimatedDots() {
  const dots = [
    { cls: 'bg-purple-500/80', delay: '0ms' },
    { cls: 'bg-purple-400/75', delay: '160ms' },
    { cls: 'bg-purple-300/65', delay: '320ms' },
  ]
  return (
    <div className="inline-flex items-center gap-1.5">
      {dots.map((d, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${d.cls} animate-bounce`}
          style={{ animationDelay: d.delay }}
        />
      ))}
    </div>
  )
}

export default function MeuPerfilPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [profissao, setProfissao] = useState('')

  // avatar_url no banco pode ser:
  // - URL pública (antigo)
  // - path dentro do bucket (novo): "userId/userId.jpg"
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null)

  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)

  const fileRef = useRef<HTMLInputElement | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Minhas Avaliações (FUNCIONARIO only)
  type AvaliacaoItem = {
    id: string
    paciente_nome: string
    data_avaliacao: string
  }
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoItem[]>([])
  const [avaliacoesLoading, setAvaliacoesLoading] = useState(false)

  function isHttpUrl(v: string) {
    return /^https?:\/\//i.test(v)
  }

  async function refreshAvatarSrc(raw: string | null) {
    if (!raw) {
      setAvatarSrc(null)
      return
    }

    if (isHttpUrl(raw)) {
      setAvatarSrc(raw)
      return
    }

    const { data, error } = await supabase.storage.from('avatars').createSignedUrl(raw, 60 * 60)
    if (error || !data?.signedUrl) {
      const pub = supabase.storage.from('avatars').getPublicUrl(raw)
      setAvatarSrc(pub.data.publicUrl ?? null)
      return
    }

    setAvatarSrc(data.signedUrl)
  }

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return

      if (!mounted) return
      setUserId(data.user.id)
      setEmail(data.user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('nome, profissao, avatar_url, role')
        .eq('id', data.user.id)
        .single()

      if (!mounted) return
      if (profile) {
        setNome(profile.nome ?? '')
        setProfissao(profile.profissao ?? '')
        setUserRole(profile.role ?? null)
        const raw = (profile.avatar_url as string | null) ?? null
        setAvatarUrl(raw)
        await refreshAvatarSrc(raw)

        // Load evaluations for FUNCIONARIO
        if (profile.role === 'FUNCIONARIO') {
          loadAvaliacoes(data.user.id)
        }
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  async function loadAvaliacoes(profId: string) {
    setAvaliacoesLoading(true)
    try {
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('clinica_id')
        .eq('id', profId)
        .single()
      
      let q = supabase
        .from('anamneses')
        .select('id, data_avaliacao, paciente_id, pacientes(nome)')
        .eq('profissional_id', profId)
        .order('data_avaliacao', { ascending: false })
        .limit(30)
      
      if (myProfile?.clinica_id) {
        q = (q as any).eq('clinica_id', myProfile.clinica_id)
      }
      
      const { data, error } = await q

      if (error) throw error

      const items: AvaliacaoItem[] = (data || []).map((a: any) => ({
        id: a.id,
        paciente_nome: a.pacientes?.nome || 'Paciente',
        data_avaliacao: a.data_avaliacao,
      }))
      setAvaliacoes(items)
    } catch (e) {
      console.error('[MeuPerfil] Erro ao carregar avaliações:', e)
    } finally {
      setAvaliacoesLoading(false)
    }
  }

  function formatDateBR(iso: string | null) {
    if (!iso) return '—'
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }

  async function salvarPerfil() {
    if (!userId) return
    setLoading(true)
    setErr(null)
    setMsg(null)

    const { error } = await supabase
      .from('profiles')
      .update({
        nome,
        profissao,
        avatar_url: avatarUrl,
      })
      .eq('id', userId)

    if (error) setErr('Erro ao salvar perfil.')
    else setMsg('Perfil atualizado com sucesso.')

    setLoading(false)
  }

  async function trocarSenha() {
    setErr(null)
    setMsg(null)

    if (!senha || senha.length < 6) {
      setErr('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (senha !== confirmarSenha) {
      setErr('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: senha })

    if (error) setErr('Erro ao atualizar senha.')
    else {
      setMsg('Senha atualizada com sucesso.')
      setSenha('')
      setConfirmarSenha('')
    }

    setLoading(false)
  }

  async function uploadAvatar(file: File) {
    if (!userId) return

    setErr(null)
    setMsg(null)
    setLoading(true)

    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()

      // salva dentro da pasta do usuário (bate com policy "own folder")
      const filePath = `${userId}/${userId}.${ext}`

      const { error: upErr } = await supabase.storage.from('avatars').upload(filePath, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
        cacheControl: '3600',
      })
      if (upErr) throw upErr

      // ✅ CRÍTICO: persistir no banco (senão some no refresh e o Sidebar não acha)
      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: filePath }).eq('id', userId)
      if (dbErr) throw dbErr

      setAvatarUrl(filePath)
      await refreshAvatarSrc(filePath)
      setMsg('Foto atualizada com sucesso.')

      // limpa input pra permitir selecionar o mesmo arquivo de novo
      if (fileRef.current) fileRef.current.value = ''
    } catch (e: any) {
      setErr(`Erro ao enviar imagem. (${e?.message || 'erro'})`)
    } finally {
      setLoading(false)
    }
  }

  // --- Design System de Alto Padrão (Método 1 Milhão) ---
  const luxuryInput = "w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all text-sm shadow-sm placeholder:text-slate-400"
  const luxuryLabel = "block text-sm font-semibold text-slate-700 mb-2 ml-1"
  const luxuryButtonPrimary = "w-full md:w-fit md:px-10 h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 active:scale-[0.98] flex items-center justify-center gap-2"
  const luxuryButtonSecondary = "w-full md:w-fit md:px-10 h-12 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all shadow-sm hover:shadow active:scale-[0.98] flex items-center justify-center gap-2"

  return (
    <main className="min-h-screen bg-slate-50/50">
      {/* 1. CORREÇÃO DE HIERARQUIA: Header FORA do card e ocupando w-full */}
      <div className="w-full bg-slate-50/50 pb-6 pt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PageHeader
            icon={User}
            title="Meu Perfil"
            subtitle="Gerencie suas informações e segurança"
            showBackButton={true}
          />
        </div>
      </div>

      {/* 2. CARD DE CONTEÚDO (Modal Central) */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="max-w-4xl mx-auto">
          
          {loading && (
            <div className="mb-6 flex justify-center">
              <AnimatedDots />
            </div>
          )}

          {/* FEEDBACK VISUAL */}
          {err && (
            <div className="mb-6 p-4 rounded-[24px] bg-rose-50 border border-rose-200 flex items-center gap-3 shadow-sm animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <p className="text-sm font-medium text-rose-700">{err}</p>
            </div>
          )}

          {msg && (
            <div className="mb-6 p-4 rounded-[24px] bg-emerald-50 border border-emerald-200 flex items-center gap-3 shadow-sm animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-medium text-emerald-700">{msg}</p>
            </div>
          )}

          {/* CARD DE LUXO */}
          <div className="rounded-[32px] bg-white/80 backdrop-blur-md border border-white/20 shadow-2xl overflow-hidden">
            {/* SEÇÃO: INFORMAÇÕES DO PERFIL */}
            <div className="p-8 md:p-10">
              <div className="mb-8 flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center shadow-inner">
                  <User className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Informações do Perfil</h2>
                  <p className="text-sm text-slate-500">Seus dados pessoais e foto</p>
                </div>
              </div>

              {/* AVATAR */}
              <div className="flex flex-col items-center gap-6 mb-10">
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={loading}
                    className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-white shadow-xl transition-all disabled:opacity-60 group-hover:ring-purple-100"
                    title="Clique para alterar foto"
                  >
                    {avatarSrc ? (
                      <img
                        src={avatarSrc + (avatarSrc.includes('?') ? '&' : '?') + 'v=' + Date.now()}
                        alt="Avatar"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
                        <User className="w-12 h-12 text-purple-400" />
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Camera className="w-8 h-8 text-white drop-shadow-md" />
                    </div>
                  </button>
                  <div className="absolute bottom-1 right-1 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg pointer-events-none">
                     <Camera className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="text-center">
                  <button 
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-sm font-bold text-purple-600 hover:text-purple-700 hover:underline decoration-2 underline-offset-4 transition-all"
                  >
                    Alterar foto de perfil
                  </button>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Recomendado: JPG ou PNG, max 2MB</p>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) uploadAvatar(e.target.files[0])
                  }}
                />
              </div>

              {/* CAMPOS - GRID DESKTOP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
                <div>
                  <label className={luxuryLabel}>Nome completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className={`${luxuryInput} pl-11`}
                      placeholder="Digite seu nome"
                    />
                  </div>
                </div>

                <div>
                  <label className={luxuryLabel}>Profissão</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 font-bold flex items-center justify-center text-[10px] border border-slate-400 rounded-sm h-3.5 px-0.5">ID</div>
                    <input
                      value={profissao}
                      onChange={(e) => setProfissao(e.target.value)}
                      className={`${luxuryInput} pl-11`}
                      placeholder="Ex: Médico, Dentista"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className={luxuryLabel}>E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={email}
                      disabled
                      className={`${luxuryInput} pl-11 bg-slate-50/50 text-slate-500 cursor-not-allowed border-dashed`}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400 ml-1">Para alterar seu e-mail, entre em contato com o suporte.</p>
                </div>
              </div>

              {/* BOTÃO SALVAR */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={salvarPerfil}
                  disabled={loading}
                  className={luxuryButtonPrimary}
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>

            {/* DIVISOR ESTILIZADO */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* SEÇÃO: SEGURANÇA */}
            <div className="p-8 md:p-10 bg-slate-50/30">
              <div className="mb-8 flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center shadow-inner">
                  <Lock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Segurança</h2>
                  <p className="text-sm text-slate-500">Gerencie sua senha de acesso</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-6">
                <div>
                  <label className={luxuryLabel}>Nova senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showSenha ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className={`${luxuryInput} pl-11`}
                    />
                  </div>
                </div>

                <div>
                  <label className={luxuryLabel}>Confirmar senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showSenha ? 'text' : 'password'}
                      placeholder="Repita a senha"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      className={`${luxuryInput} pl-11`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-8">
                <label className="flex items-center gap-2.5 text-sm font-medium text-slate-600 cursor-pointer hover:text-slate-900 transition-colors select-none">
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${showSenha ? 'bg-purple-600 border-purple-600' : 'bg-white border-slate-300'}`}>
                    {showSenha && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={showSenha}
                    onChange={() => setShowSenha(!showSenha)}
                    className="hidden"
                  />
                  Mostrar senha
                </label>
              </div>

              {/* BOTÃO ATUALIZAR SENHA */}
              <div className="flex flex-col md:flex-row items-center justify-end gap-4">
                 <p className="text-xs text-slate-400 text-center md:text-right order-2 md:order-1">
                  💡 Use uma senha forte com letras, números e símbolos
                </p>
                <button
                  type="button"
                  onClick={trocarSenha}
                  disabled={loading}
                  className={`${luxuryButtonSecondary} order-1 md:order-2`}
                >
                  {loading ? 'Atualizando...' : 'Atualizar Senha'}
                </button>
              </div>
            </div>

            {/* SEÇÃO: MINHAS AVALIAÇÕES (FUNCIONARIO only) */}
            {userRole === 'FUNCIONARIO' && (
              <>
                <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                <div className="p-8 md:p-10">
                  <div className="mb-8 flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center shadow-inner">
                      <ClipboardList className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Minhas Avaliações</h2>
                      <p className="text-sm text-slate-500">Últimas anamneses realizadas por você</p>
                    </div>
                    <div className="ml-auto">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-xs font-semibold text-purple-700">
                        {avaliacoes.length} registro{avaliacoes.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {avaliacoesLoading ? (
                    <div className="flex justify-center py-8">
                      <AnimatedDots />
                    </div>
                  ) : avaliacoes.length === 0 ? (
                    <div className="text-center py-10">
                      <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">Nenhuma avaliação registrada ainda.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {avaliacoes.map((av) => (
                        <div
                          key={av.id}
                          className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200/60 bg-white/70 hover:bg-white hover:shadow-sm transition-all"
                        >
                          <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                            <User className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{av.paciente_nome}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span className="text-xs text-slate-500">{formatDateBR(av.data_avaliacao)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
