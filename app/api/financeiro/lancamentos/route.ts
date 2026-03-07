import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || ''

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const { data: prof } = await supabaseAdmin
      .from('profiles')
      .select('clinica_id, role')
      .eq('id', user.id)
      .single()

    if (!prof?.clinica_id || prof.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    }

    const body = await req.json()
    const { tipo, categoria, descricao, valor, data_lancamento, status } = body

    if (!tipo || !categoria || !valor || !data_lancamento) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('lancamentos_financeiros')
      .insert({
        clinica_id: prof.clinica_id,
        tipo,
        categoria,
        descricao: descricao || null,
        valor: parseFloat(String(valor)),
        data_lancamento,
        status: status || 'CONFIRMADO',
      })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, id: data.id })
  } catch (err: any) {
    console.error('[financeiro/lancamentos] error:', err)
    return NextResponse.json(
      { error: err?.message || 'Erro interno.' },
      { status: 500 }
    )
  }
}
