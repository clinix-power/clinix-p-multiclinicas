import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : null,
    !supabaseAnonKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : null,
  ].filter(Boolean)

  throw new Error(
    `Supabase env vars ausentes: ${missing.join(', ')}. ` +
      `Crie/ajuste o arquivo .env.local na raiz do projeto e reinicie o dev server.`
  )
}

const isBrowser = typeof window !== 'undefined'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'clinix-power-auth',
    storage: isBrowser ? window.localStorage : undefined,
  }
})

/**
 * Garante que a sessão está válida antes de fazer queries.
 * Tenta refresh se o access_token expirou.
 * Retorna o user ou null (sessão irrecuperável → deve redirecionar ao login).
 */
export async function ensureValidSession() {
  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData.session) {
    // Fallback: quando o browser mata a tab e restaura, o cache em memória
    // fica vazio mas o refresh_token ainda está no localStorage.
    // Verifica se existe refresh_token antes de tentar recuperar (evita erro no console).
    if (isBrowser) {
      const storageKey = 'clinix-power-auth'
      const stored = window.localStorage.getItem(storageKey)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (parsed?.refresh_token) {
            const { data: recovered, error: recoverErr } = await supabase.auth.refreshSession()
            if (!recoverErr && recovered.session) {
              return recovered.session.user
            }
          }
        } catch {
          // JSON parse falhou — localStorage corrompido, ignora
        }
      }
    }
    return null
  }

  // Tenta refresh para garantir token fresco
  const expiresAt = sessionData.session.expires_at ?? 0
  const now = Math.floor(Date.now() / 1000)

  if (expiresAt - now < 60) {
    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession()
    if (refreshErr || !refreshed.session) {
      console.warn('[ensureValidSession] refresh falhou:', refreshErr?.message)
      return null
    }
    return refreshed.session.user
  }

  return sessionData.session.user
}
