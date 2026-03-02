import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Gemini REST API helper
async function callGeminiREST(opts: { apiKey: string; model: string; prompt: string }) {
  const { apiKey, model, prompt } = opts
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 1024,
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Gemini API error (${res.status}): ${errText}`)
  }

  const json = await res.json()
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return text.trim()
}

export async function POST(req: NextRequest) {
  try {
    // Auth: verifica se é chamada interna (cron) ou do próprio admin
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

    let clinicaId: string | null = null

    if (isCron) {
      // chamada do cron — pega clinica_id do body
      const body = await req.json().catch(() => ({}))
      clinicaId = body.clinica_id || null
    } else {
      // chamada direta — verifica session do usuário
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
      clinicaId = prof.clinica_id
    }

    if (!clinicaId) {
      return NextResponse.json({ error: 'clinica_id não encontrado.' }, { status: 400 })
    }

    // Verifica plano ULTIMATE
    const { data: clinicaData } = await supabaseAdmin
      .from('clinicas')
      .select('id, nome, planos(nome, recursos)')
      .eq('id', clinicaId)
      .single()

    const plano = (clinicaData as any)?.planos
    const recursos = plano?.recursos || {}
    if (!recursos.ia_consultora) {
      return NextResponse.json({ error: 'Recurso ia_consultora não disponível no plano atual.' }, { status: 403 })
    }

    // Coleta dados financeiros dos últimos 3 meses
    const hoje = new Date().toISOString().split('T')[0]
    const tres_meses_atras = new Date()
    tres_meses_atras.setMonth(tres_meses_atras.getMonth() - 3)
    const inicio3m = tres_meses_atras.toISOString().split('T')[0]
    const inicio_mes = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`

    const [
      { data: lancamentos },
      { count: totalPacientes },
      { count: pacAtivos },
      { count: sessoesMes },
      { data: convenios },
    ] = await Promise.all([
      supabaseAdmin
        .from('lancamentos_financeiros')
        .select('tipo, categoria, valor, data_lancamento, status')
        .eq('clinica_id', clinicaId)
        .gte('data_lancamento', inicio3m)
        .lte('data_lancamento', hoje)
        .eq('status', 'CONFIRMADO'),
      supabaseAdmin
        .from('pacientes')
        .select('*', { count: 'exact', head: true })
        .eq('clinica_id', clinicaId),
      supabaseAdmin
        .from('pacientes')
        .select('*', { count: 'exact', head: true })
        .eq('clinica_id', clinicaId)
        .eq('status', 'Ativo'),
      supabaseAdmin
        .from('agendamentos')
        .select('*', { count: 'exact', head: true })
        .eq('clinica_id', clinicaId)
        .eq('status', 'REALIZADO')
        .gte('data', inicio_mes)
        .lte('data', hoje),
      supabaseAdmin
        .from('convenios')
        .select('nome, valor_sessao')
        .eq('clinica_id', clinicaId)
        .eq('ativo', true),
    ])

    const receita3m = (lancamentos || [])
      .filter((l: any) => l.tipo === 'RECEITA')
      .reduce((s: number, l: any) => s + l.valor, 0)
    const despesa3m = (lancamentos || [])
      .filter((l: any) => l.tipo === 'DESPESA')
      .reduce((s: number, l: any) => s + l.valor, 0)
    const saldo3m = receita3m - despesa3m
    const margem = receita3m > 0 ? ((saldo3m / receita3m) * 100).toFixed(1) : '0'

    // Monta prompt estratégico
    const clinicaNome = (clinicaData as any)?.nome || 'Clínica'
    const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

    const prompt = `Você é a **Consultora IA Clinix**, especialista em gestão estratégica de clínicas de saúde no Brasil.
Data de hoje: ${dataAtual}
Clínica: ${clinicaNome}

## Dados Financeiros (últimos 3 meses)
- Receita total: R$ ${receita3m.toFixed(2)}
- Despesas totais: R$ ${despesa3m.toFixed(2)}
- Saldo líquido: R$ ${saldo3m.toFixed(2)}
- Margem de lucro: ${margem}%

## Dados Operacionais (mês atual)
- Total de pacientes cadastrados: ${totalPacientes || 0}
- Pacientes ativos: ${pacAtivos || 0}
- Sessões realizadas neste mês: ${sessoesMes || 0}

## Convênios Ativos
${(convenios || []).map((c: any) => `- ${c.nome}: R$ ${c.valor_sessao.toFixed(2)}/sessão`).join('\n') || '- Nenhum convênio cadastrado'}

## Sua Missão
Analise esses dados e gere **3 insights estratégicos** para o gestor da clínica, focando em:
1. Saúde financeira e oportunidades de crescimento de receita
2. Retenção de pacientes e eficiência operacional
3. Redução de despesas e otimização do negócio

## Formato da Resposta
Responda em JSON puro (sem markdown), no formato:
{
  "insights": [
    {
      "titulo": "Título curto do insight (máx. 60 chars)",
      "descricao": "Análise detalhada e ação específica recomendada (máx. 280 chars)",
      "prioridade": "ALTA" | "MEDIA" | "BAIXA",
      "tipo": "FINANCEIRO" | "OPERACIONAL" | "ESTRATEGICO"
    }
  ]
}

Seja direto, prático e específico para o contexto da clínica. Use dados reais para embasar cada insight.`

    const apiKey = (process.env.GEMINI_API_KEY || '').trim()
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY não configurada.' }, { status: 500 })
    }

    const respText = await callGeminiREST({
      apiKey,
      model: 'gemini-1.5-flash',
      prompt,
    })

    let parsed: { insights: { titulo: string; descricao: string; prioridade: string; tipo: string }[] }
    try {
      parsed = JSON.parse(respText)
    } catch {
      // Tenta extrair JSON do texto
      const match = respText.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta da IA não contém JSON válido.')
      parsed = JSON.parse(match[0])
    }

    // Salva cada insight no banco
    const inserts = parsed.insights.map(insight => ({
      clinica_id: clinicaId,
      titulo: insight.titulo,
      descricao: insight.descricao,
      prioridade: insight.prioridade,
      tipo: insight.tipo,
      lido: false,
    }))

    const { data: saved, error: saveErr } = await supabaseAdmin
      .from('consultora_insights')
      .insert(inserts)
      .select('id')

    if (saveErr) throw saveErr

    return NextResponse.json({
      success: true,
      insights_gerados: inserts.length,
      ids: (saved || []).map((r: any) => r.id),
    })
  } catch (err: any) {
    console.error('[consultora/gerar] error:', err)
    return NextResponse.json({ error: err?.message || 'Erro interno.' }, { status: 500 })
  }
}
