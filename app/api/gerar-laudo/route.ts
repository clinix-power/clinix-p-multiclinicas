import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    if (!token) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userRes?.user) {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { paciente_id } = body

    if (!paciente_id) {
      return NextResponse.json({ error: 'paciente_id é obrigatório' }, { status: 400 })
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    })

    const { data: paciente, error: pacienteErr } = await supabaseUser
      .from('pacientes')
      .select('id,nome,data_nascimento,cpf')
      .eq('id', paciente_id)
      .single()

    if (pacienteErr || !paciente) {
      return NextResponse.json({ error: pacienteErr?.message || 'Paciente não encontrado' }, { status: 400 })
    }

    const { data: evolucoes } = await supabaseUser
      .from('evolucoes_clinicas')
      .select('created_at,texto_original,texto_melhorado_ia,profissional_id')
      .eq('paciente_id', paciente_id)
      .order('created_at', { ascending: false })
      .limit(20)

    const linhas = (evolucoes || []).map((e: any) => {
      const texto = (e.texto_melhorado_ia || e.texto_original || '').trim()
      const dt = new Date(e.created_at).toLocaleString('pt-BR')
      return `- ${dt}: ${texto}`
    })

    const laudo = [
      `LAUDO FISIOTERAPÊUTICO`,
      ``,
      `Paciente: ${(paciente as any)?.nome || '-'}`,
      `Nasc.: ${(paciente as any)?.data_nascimento ? new Date((paciente as any).data_nascimento).toLocaleDateString('pt-BR') : '-'}`,
      `CPF: ${(paciente as any)?.cpf || '-'}`,
      ``,
      `Histórico recente (baseado nas evoluções registradas):`,
      linhas.length ? linhas.join('\n') : '- Sem evoluções registradas.',
      ``,
      `Assinatura do profissional no rodapé (gerada no front).`,
    ].join('\n')

    return NextResponse.json({ laudo })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro inesperado' }, { status: 500 })
  }
}
