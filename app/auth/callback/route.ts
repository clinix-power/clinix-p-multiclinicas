import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  // Se não vier code, volta pro login
  if (!code) {
    return NextResponse.redirect(new URL('/login', url.origin))
  }

  // Troca o code por sessão
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  // Se deu erro, volta pro login
  if (error) {
    return NextResponse.redirect(new URL('/login', url.origin))
  }

  // Se autenticou, manda pro onboarding da clínica
  return NextResponse.redirect(new URL('/onboarding/clinica', url.origin))
}