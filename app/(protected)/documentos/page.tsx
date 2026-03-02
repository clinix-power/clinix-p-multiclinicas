'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Paciente = {
  id: string
  nome: string
  data_nascimento: string | null
  cpf?: string | null
}

type Profile = {
  nome: string | null
  profissao: string | null
  registro_tipo: string | null
  registro_numero: string | null
  clinica_id: string | null
}

function formatDateBR(dateISO?: string | null) {
  if (!dateISO) return ''
  const d = new Date(dateISO)
  if (Number.isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function maskCPF(cpf?: string | null) {
  if (!cpf) return ''
  const digits = cpf.replace(/\D/g, '')
  if (digits.length < 4) return '••••'
  return `${digits.slice(0, 3)}.•••.•••-${digits.slice(-2)}`
}

export default function DocumentosPage() {
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)

  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [pacienteId, setPacienteId] = useState<string>('')

  const [laudo, setLaudo] = useState<string>('')

  const [profile, setProfile] = useState<Profile | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')

  const pacienteSelecionado = useMemo(() => {
    return pacientes.find((p) => p.id === pacienteId) || null
  }, [pacienteId, pacientes])

  const assinaturaProfissional = useMemo(() => {
    if (!profile) return ''
    const nome = profile.nome?.trim() || ''
    const prof = profile.profissao?.trim() || ''
    const tipo = profile.registro_tipo?.trim() || ''
    const num = profile.registro_numero?.trim() || ''

    const partes: string[] = []
    if (nome) partes.push(nome)
    if (prof) partes.push(prof)

    const reg = [tipo, num].filter(Boolean).join(' ')
    if (reg) partes.push(reg)

    return partes.join(' • ')
  }, [profile])

  async function carregarPacientes() {
    setLoading(true)
    setErrorMsg('')
    try {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user
      if (!user) {
        setErrorMsg('Sessão não encontrada. Faça login novamente.')
        return
      }

      const { data: profData, error: profErr } = await supabase
        .from('profiles')
        .select('nome, profissao, registro_tipo, registro_numero, clinica_id')
        .eq('id', user.id)
        .single()

      if (profErr) throw profErr
      setProfile((profData || null) as any)

      const { data, error } = await supabase
        .from('pacientes')
        .select('id,nome,data_nascimento')
        .eq('clinica_id', profData?.clinica_id)
        .order('nome', { ascending: true })

      if (error) throw error
      setPacientes((data || []) as Paciente[])
    } catch (e: any) {
      setErrorMsg(e?.message || 'Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarPacientes()
  }, [])

  async function gerarLaudo() {
    if (!pacienteId) {
      setErrorMsg('Selecione um paciente para gerar o laudo.')
      return
    }

    setGerando(true)
    setErrorMsg('')

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.')

      const res = await fetch('/api/gerar-laudo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ paciente_id: pacienteId }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`)

      const texto = typeof data === 'string' ? data : data?.laudo
      if (!texto || typeof texto !== 'string') {
        throw new Error('Resposta inválida do servidor de laudo.')
      }

      setLaudo(texto)
    } catch (e: any) {
      setErrorMsg(
        e?.message || 'Falha ao gerar laudo. Tente novamente.'
      )
    } finally {
      setGerando(false)
    }
  }

  function gerarPDF() {
    const w = window.open('', '_blank')
    if (!w) {
      setErrorMsg('Bloqueio de pop-up ativo. Permita pop-ups para gerar PDF.')
      return
    }

    const paciente = pacienteSelecionado
    const assinatura = assinaturaProfissional || '—'

    const header = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:1px solid #e5e7eb;padding-bottom:12px;margin-bottom:16px;">
        <div>
          <div style="font-size:18px;font-weight:700;letter-spacing:-0.2px;">Laudo Fisioterapêutico</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">Documento clínico gerado com apoio de IA (sem inventar conteúdo)</div>
        </div>
        <div style="text-align:right;font-size:12px;color:#6b7280;">
          <div><b>Emissão:</b> ${new Date().toLocaleString('pt-BR')}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:16px;">
        <div style="font-size:12px;"><b>Paciente:</b> ${paciente?.nome || '-'}</div>
        <div style="font-size:12px;"><b>Nasc.:</b> ${formatDateBR(paciente?.data_nascimento) || '-'}</div>
        <div style="font-size:12px;"><b>CPF:</b> ${maskCPF(paciente?.cpf) || '-'}</div>
      </div>
    `

    const footer = `
      <div style="margin-top:18px;border-top:1px solid #e5e7eb;padding-top:12px;font-size:12px;color:#374151;">
        <div style="font-weight:600;color:#111827;">Assinatura</div>
        <div style="margin-top:4px;">${assinatura.replace(/</g, '&lt;')}</div>
        <div style="margin-top:10px;font-size:11px;color:#6b7280;">CLINIX POWER • Sistema Clínico Profissional</div>
      </div>
    `

    w.document.write(`
      <html>
      <head>
        <title>Laudo Fisioterapêutico</title>
        <meta charset="utf-8" />
      </head>
      <body style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; padding:24px; color:#111827;">
        ${header}
        <pre style="white-space:pre-wrap;word-break:break-word;font-size:12.5px;line-height:1.55;margin:0;">${(laudo || '').replace(
          /</g,
          '&lt;'
        )}</pre>
        ${footer}
      </body>
      </html>
    `)
    w.document.close()
    w.focus()
    w.print()
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Laudos Fisioterapêuticos
        </h1>

        <p className="mt-1 text-sm text-neutral-600 flex items-center gap-2">
          Inteligência Avançada na Construção de Laudos Clínicos
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600/10 text-blue-700">
            ⚡
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* Painel esquerdo */}
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="p-5 border-b border-neutral-200">
            <div className="text-sm font-medium text-neutral-900">Gerar laudo</div>
            <div className="text-xs text-neutral-500 mt-1">
              Selecione o paciente e gere uma versão profissional do documento.
            </div>
          </div>

          <div className="p-5 space-y-4">
            {errorMsg ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-neutral-800">
                Paciente
              </label>

              <select
                className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-blue-500"
                value={pacienteId}
                onChange={(e) => setPacienteId(e.target.value)}
                disabled={loading}
              >
                <option value="" disabled hidden>
                  Escolha um paciente...
                </option>

                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>

              {pacienteSelecionado ? (
                <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                  <div className="text-xs text-neutral-500">Selecionado</div>
                  <div className="text-sm font-medium text-neutral-900">
                    {pacienteSelecionado.nome}
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">
                    Nasc.: {formatDateBR(pacienteSelecionado.data_nascimento) || '-'} • CPF:{' '}
                    {maskCPF(pacienteSelecionado.cpf) || '-'}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={gerarLaudo}
                disabled={loading || gerando || !pacienteId}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gerando ? 'Gerando...' : 'Gerar laudo'}
              </button>

              <button
                type="button"
                onClick={gerarPDF}
                disabled={!laudo}
                className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Gerar PDF
              </button>
            </div>
          </div>
        </div>

        {/* Pré-visualização */}
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b border-neutral-200">
            <div className="text-sm font-medium text-neutral-900">
              Laudo fisioterapêutico — Pré-visualização (antes do PDF)
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              Gere um laudo para ver o conteúdo aqui.
            </div>
          </div>

          <div className="p-5">
            {!laudo ? (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-neutral-500">
                Selecione um paciente e clique em <b>Gerar laudo</b>.
              </div>
            ) : (
              <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="flex items-start justify-between gap-6 border-b border-neutral-200 pb-4 mb-4">
                  <div>
                    <div className="text-lg font-semibold tracking-tight text-neutral-900">
                      Laudo Fisioterapêutico
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      Documento clínico gerado com apoio de IA (sem inventar conteúdo)
                    </div>
                  </div>

                  <div className="text-right text-xs text-neutral-500">
                    <div>
                      <span className="font-medium text-neutral-700">Emissão:</span>{' '}
                      {new Date().toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4 text-sm">
                  <div>
                    <span className="text-neutral-500">Paciente:</span>{' '}
                    <span className="font-medium text-neutral-900">
                      {pacienteSelecionado?.nome || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Nasc.:</span>{' '}
                    <span className="font-medium text-neutral-900">
                      {formatDateBR(pacienteSelecionado?.data_nascimento) || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500">CPF:</span>{' '}
                    <span className="font-medium text-neutral-900">
                      {maskCPF(pacienteSelecionado?.cpf) || '-'}
                    </span>
                  </div>
                </div>

                <pre className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-neutral-900 m-0">
                  {laudo}
                </pre>

                <div className="mt-5 border-t border-neutral-200 pt-4">
                  <div className="text-xs text-neutral-500">Assinatura</div>
                  <div className="mt-1 text-sm font-medium text-neutral-900">
                    {assinaturaProfissional || '—'}
                  </div>
                  <div className="mt-2 text-[11px] text-neutral-500">
                    CLINIX POWER • Sistema Clínico Profissional
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}