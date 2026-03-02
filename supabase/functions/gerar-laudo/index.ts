// supabase/functions/gerar-laudo/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getBearerToken(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const match = auth.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const token = getBearerToken(req)

    if (!token) return json({ error: 'Missing authorization header' }, 401)

    // Client com headers do usuário (RLS e auth funcionam)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_ANON_KEY,
        },
      },
    })

    // Valida JWT aqui (já que verify_jwt está false)
    const { data: userRes, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userRes?.user) {
      return json({ error: 'Invalid JWT' }, 401)
    }

    const { paciente_id } = await req.json()
    if (!paciente_id) return json({ error: 'paciente_id é obrigatório' }, 400)

    // Puxa paciente
    const { data: paciente, error: pacienteErr } = await supabase
      .from('pacientes')
      .select('id,nome,data_nascimento,cpf')
      .eq('id', paciente_id)
      .single()

    if (pacienteErr) return json({ error: pacienteErr.message }, 400)

    // Puxa evoluções (ajuste nomes de tabela/colunas se necessário)
    const { data: evolucoes, error: evoErr } = await supabase
      .from('evolucoes')
      .select('created_at,texto_original,texto_melhorado_ia,profissional_id')
      .eq('paciente_id', paciente_id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (evoErr) return json({ error: evoErr.message }, 400)

    // ⚠️ Aqui você chama sua IA (Ollama/whatever) e monta o laudo.
    // Por enquanto: laudo simples (não inventa nada)
    const linhas = (evolucoes || []).map((e: any) => {
      const texto = (e.texto_melhorado_ia || e.texto_original || '').trim()
      const dt = new Date(e.created_at).toLocaleString('pt-BR')
      return `- ${dt}: ${texto}`
    })

    const laudo = [
      `LAUDO FISIOTERAPÊUTICO`,
      ``,
      `Paciente: ${paciente?.nome || '-'}`,
      `Nasc.: ${paciente?.data_nascimento ? new Date(paciente.data_nascimento).toLocaleDateString('pt-BR') : '-'}`,
      `CPF: ${paciente?.cpf ? paciente.cpf : '-'}`,
      ``,
      `Histórico recente (baseado nas evoluções registradas):`,
      linhas.length ? linhas.join('\n') : '- Sem evoluções registradas.',
      ``,
      `Assinatura do profissional no rodapé (gerada no front).`,
    ].join('\n')

    return json({ laudo })
  } catch (e: any) {
    return json({ error: e?.message || 'Erro inesperado' }, 500)
  }
})