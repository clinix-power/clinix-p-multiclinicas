import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type Body = {
  original?: string
  assinatura?: string | null
  paciente?: {
    id?: string
    nome?: string
    data_nascimento?: string | null
  }
}

function safeStr(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

function withTimeout(ms: number) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  return { ctrl, cancel: () => clearTimeout(t) }
}

// fallback simples: melhora formatação sem inventar nada
function fallbackMelhorarTexto(original: string) {
  let out = (original || '').trim()
  if (!out) return ''
  out = out.replace(/\r\n/g, '\n')
  out = out.replace(/[ \t]+/g, ' ')
  out = out.replace(/\n{3,}/g, '\n\n')
  out = out
    .split('\n')
    .map((line) => {
      const l = line.trim()
      if (!l) return ''
      if (/^[-•]\s+/.test(l)) return `• ${l.replace(/^[-•]\s+/, '')}`
      return l
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
  return out.trim()
}

function isBadOutput(text: string) {
  const t = (text || '').trim()
  if (!t) return true
  if (/máximo\s*\d+/i.test(t)) return true
  if (/couldn't find|could not find|please provide/i.test(t)) return true
  if (/[?]/.test(t)) return true
  if (t.length < 80) return true
  const lines = t.split('\n').map((x) => x.trim()).filter(Boolean)
  if (lines.length <= 2 && !/[.:;]/.test(t)) return true
  return false
}

function cleanText(text: string) {
  let t = (text || '').trim()
  t = t.replace(/^```[a-z]*\s*/i, '').replace(/```$/i, '').trim()
  return t
}

function extractGeminiText(json: any): string {
  // tenta vários caminhos, porque o formato pode variar
  const parts = json?.candidates?.[0]?.content?.parts
  if (Array.isArray(parts)) {
    const joined = parts
      .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
      .join('')
      .trim()
    if (joined) return joined
  }

  const alt = json?.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof alt === 'string' && alt.trim()) return alt.trim()

  // alguns retornos podem vir como "text" direto (raro)
  const direct = json?.candidates?.[0]?.text
  if (typeof direct === 'string' && direct.trim()) return direct.trim()

  return ''
}

async function callGeminiREST(opts: {
  apiKey: string
  model: string
  promptUser: string
  signal: AbortSignal
}) {
  const { apiKey, model, promptUser, signal } = opts

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`

  // ✅ instrução mais “fisioterapeuta” e mais orientada em COMO escrever
  const systemInstruction =
    'Você é um FISIOTERAPEUTA clínico brasileiro experiente, especialista em EVOLUÇÕES. ' +
    'Responda SOMENTE em PT-BR. ' +
    'Tarefa: transformar anotações/rashos em uma evolução técnica, clara e profissional. ' +
    'Use termos de fisio quando fizer sentido (ADM, dor à palpação, mobilizações, liberação miofascial, exercícios terapêuticos, propriocepção, marcha, estabilidade, dor EVA). ' +
    'REGRAS: NÃO invente dados. NÃO crie diagnósticos novos. NÃO faça perguntas. NÃO mencione regras/limitações. ' +
    'IMPORTANTE: reescreva com outras palavras (não copie frases do rascunho). ' +
    'Entregue APENAS o texto final da evolução.'

  const body = {
    // ESTE é o formato correto do v1beta para systemInstruction
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: promptUser }] }],
    generationConfig: {
      temperature: 0.55,
      topP: 0.85,
      maxOutputTokens: 650,
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify(body),
  })

  const rawText = await res.text().catch(() => '')

  if (!res.ok) {
    // devolve o erro do google inteiro (pra debugar)
    throw new Error(rawText || `Falha Gemini (${res.status})`)
  }

  let json: any = null
  try {
    json = rawText ? JSON.parse(rawText) : null
  } catch {
    json = null
  }

  const out = extractGeminiText(json)

  return { out, json }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null
    const original = safeStr(body?.original)

    if (!original || original.length < 5) {
      return NextResponse.json({ error: 'Texto inválido' }, { status: 400 })
    }

    const assinatura = safeStr(body?.assinatura || '')
    const pNome = safeStr(body?.paciente?.nome || '') // ✅ só nome

    const userPromptBase = `
PACIENTE:
- Nome: ${pNome || '—'}

RASCUNHO (NÃO copiar frases literalmente; reescrever com outras palavras sem inventar):
"""
${original}
"""

Gere uma evolução fisioterapêutica técnica e objetiva.
Estrutura sugerida (se fizer sentido):
- Queixa/Contexto
- Avaliação/Achados
- Conduta/Intervenções
- Resposta ao tratamento
- Plano/Orientações

Regras finais:
- Sem títulos tipo "REGRAS", "OBS", "MÁXIMO".
- Sem perguntas.
- Entregue só a evolução final.
`.trim()

    const apiKey = (process.env.GEMINI_API_KEY || '').trim()
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY não configurada no .env.local' }, { status: 500 })
    }

    const modelEnv = (process.env.GEMINI_MODEL || '').trim()

    const models = [
      modelEnv || 'gemini-1.5-flash-latest',
      'gemini-1.5-flash-001',
      'gemini-2.0-flash',
    ].filter(Boolean)

    const { ctrl, cancel } = withTimeout(25_000)

    try {
      let out = ''
      let lastJson: any = null
      let lastErr: any = null

      for (const m of models) {
        try {
          const r = await callGeminiREST({ apiKey, model: m, promptUser: userPromptBase, signal: ctrl.signal })
          lastJson = r.json
          out = cleanText(r.out || '')
          if (out) break
        } catch (e: any) {
          lastErr = e
        }
      }

      // retry agressivo se veio eco/ruim
      if (isBadOutput(out)) {
        const retry = `
${userPromptBase}

AGORA REESCREVA COMPLETAMENTE:
- Proibido reutilizar frases do rascunho (mude a redação).
- Use linguagem técnica de fisioterapia.
- 8 a 14 linhas curtas.
`.trim()

        let out2 = ''
        let lastJson2: any = null
        let lastErr2: any = null

        for (const m of models) {
          try {
            const r2 = await callGeminiREST({ apiKey, model: m, promptUser: retry, signal: ctrl.signal })
            lastJson2 = r2.json
            out2 = cleanText(r2.out || '')
            if (out2) break
          } catch (e: any) {
            lastErr2 = e
          }
        }

        out = out2 || out
        lastJson = lastJson2 || lastJson
        lastErr = lastErr2 || lastErr
      }

      // se ainda veio ruim/vazio -> fallback + DEBUG (somente em dev)
      if (isBadOutput(out)) {
        const fb = fallbackMelhorarTexto(original)
        const finalFb = assinatura ? `${fb}\n\n${assinatura}` : fb

        const isDev = process.env.NODE_ENV !== 'production'
        if (isDev) {
          return NextResponse.json(
            {
              text: finalFb,
              warning: 'Fallback aplicado (Gemini retornou vazio/ruim).',
              debugGemini: lastJson || null,
              debugError: lastErr?.message || null,
            },
            { status: 200 }
          )
        }

        return NextResponse.json({ text: finalFb, warning: 'Fallback aplicado (IA instável).' }, { status: 200 })
      }

      const finalText = assinatura ? `${out}\n\n${assinatura}` : out
      return NextResponse.json({ text: finalText }, { status: 200 })
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        const fb = fallbackMelhorarTexto(original)
        const finalFb = assinatura ? `${fb}\n\n${assinatura}` : fb
        return NextResponse.json({ text: finalFb, warning: 'IA demorou; fallback aplicado.' }, { status: 200 })
      }
      return NextResponse.json({ error: e?.message || 'Erro ao chamar Gemini' }, { status: 500 })
    } finally {
      cancel()
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro interno' }, { status: 500 })
  }
}