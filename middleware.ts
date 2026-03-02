import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rotas exclusivas de ADMIN — FUNCIONARIO nunca deve acessar
const ADMIN_ONLY_PATHS = [
  '/dashboard-admin',
  '/profissionais',
  '/agenda',
]

// Rotas exclusivas de MASTER ADMIN — verificação adicional feita no client-side via AuthGate
// Middleware apenas garante que usuário está autenticado (cookie existe)
// A verificação de is_master_admin=true é feita no componente via query ao profiles
const MASTER_ADMIN_PATHS = [
  '/admin/master',
]

// Rotas exclusivas de FUNCIONARIO — ADMIN nunca deve acessar
const FUNCIONARIO_ONLY_PATHS = [
  '/dashboard-funcionario',
  '/agenda-funcionario',
]

function pathMatchesList(path: string, list: string[]) {
  return list.some(p => path === p || path.startsWith(p + '/'))
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // Public routes that don't need auth
  const publicPaths = ['/', '/login', '/cadastro', '/cadastro-clinica', '/checkout', '/esqueci-senha', '/reset-password']
  const isPublicPath = path === '/' || publicPaths.some(p => path.startsWith(p))

  // Check lightweight auth cookie set by the client after login.
  // The vanilla @supabase/supabase-js uses localStorage (not cookies),
  // so we bridge with a simple 'clinix-auth' cookie.
  const cookieValue = req.cookies.get('clinix-auth')?.value || ''
  const hasSession = !!cookieValue

  // Redirect to login if no session and trying to access protected route
  if (!hasSession && !isPublicPath) {
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(redirectUrl)
  }

  // Prevent authenticated users from accessing login page (avoid confusion)
  if (hasSession && path === '/login') {
    const role = (cookieValue === 'ADMIN' || cookieValue === 'FUNCIONARIO') ? cookieValue : null
    if (role === 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard-admin', req.url))
    } else if (role === 'FUNCIONARIO') {
      return NextResponse.redirect(new URL('/dashboard-funcionario', req.url))
    }
    // Se cookie existe mas role é inválido, permite acesso ao login para re-autenticar
    return NextResponse.next()
  }

  // ── Role-based route guarding ──
  // O cookie carrega o role (ADMIN | FUNCIONARIO). Se for válido, bloqueia rotas cruzadas.
  const role = (cookieValue === 'ADMIN' || cookieValue === 'FUNCIONARIO') ? cookieValue : null

  // Bloquear FUNCIONARIO de acessar rotas /admin/* (exceto /admin/master que tem verificação própria)
  if (role === 'FUNCIONARIO' && (path.startsWith('/admin/') && !path.startsWith('/admin/master'))) {
    return NextResponse.redirect(new URL('/dashboard-funcionario', req.url))
  }

  if (role === 'FUNCIONARIO' && pathMatchesList(path, ADMIN_ONLY_PATHS)) {
    return NextResponse.redirect(new URL('/dashboard-funcionario', req.url))
  }

  if (role === 'ADMIN' && pathMatchesList(path, FUNCIONARIO_ONLY_PATHS)) {
    return NextResponse.redirect(new URL('/dashboard-admin', req.url))
  }

  // Allow request to proceed — role verification handled client-side by AuthGate
  const response = NextResponse.next()
  response.headers.set('Cache-Control', 'no-store, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
