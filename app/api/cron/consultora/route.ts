import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    // Verifica segredo do cron
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    // Busca todas as clínicas ULTIMATE ativas com ia_consultora habilitado
    const { data: clinicas, error } = await supabaseAdmin
      .from('clinicas')
      .select('id, nome, planos(nome, recursos)')
      .in('status', ['ACTIVE', 'TRIAL'])

    if (error) throw error

    const ultimateClinicas = (clinicas || []).filter((c: any) => {
      const recursos = c.planos?.recursos || {}
      return recursos.ia_consultora === true
    })

    if (ultimateClinicas.length === 0) {
      return NextResponse.json({ message: 'Nenhuma clínica ULTIMATE ativa encontrada.', processed: 0 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clinixpower.com.br'
    const results: { clinica_id: string; nome: string; status: string; error?: string }[] = []

    for (const clinica of ultimateClinicas) {
      try {
        const res = await fetch(`${baseUrl}/api/consultora/gerar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cronSecret}`,
          },
          body: JSON.stringify({ clinica_id: clinica.id }),
        })
        const data = await res.json()
        results.push({
          clinica_id: clinica.id,
          nome: (clinica as any).nome,
          status: res.ok ? 'success' : 'error',
          error: res.ok ? undefined : data?.error,
        })
      } catch (err: any) {
        results.push({
          clinica_id: clinica.id,
          nome: (clinica as any).nome,
          status: 'error',
          error: err?.message,
        })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length

    console.log(`[cron/consultora] Processed ${ultimateClinicas.length} clinics: ${successCount} ok, ${errorCount} errors`)

    return NextResponse.json({
      message: `Cron concluído. ${successCount}/${ultimateClinicas.length} clínicas processadas.`,
      results,
    })
  } catch (err: any) {
    console.error('[cron/consultora] error:', err)
    return NextResponse.json({ error: err?.message || 'Erro interno.' }, { status: 500 })
  }
}
