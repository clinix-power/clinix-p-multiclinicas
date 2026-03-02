/**
 * Lightweight auth cookie used by middleware to gate protected routes.
 * The vanilla @supabase/supabase-js stores sessions in localStorage (not cookies),
 * so middleware (edge runtime) cannot see them. This cookie bridges the gap.
 * Real auth verification is still done client-side by AuthGate + Supabase.
 *
 * O valor do cookie agora carrega o role (ADMIN | FUNCIONARIO) para que
 * o middleware possa fazer guarda de rota sem depender do Supabase.
 */

const COOKIE_NAME = 'clinix-auth'

export function setAuthCookie(role?: string) {
  const value = role || '1'
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=604800; SameSite=Lax`
}

export function clearAuthCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
}

export function getAuthCookieRole(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))
  const val = match ? match[1] : null
  if (val === '1' || !val) return null
  return val
}

export const AUTH_COOKIE_NAME = COOKIE_NAME
