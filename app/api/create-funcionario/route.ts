import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const { email, password, nome, profissao, registro_tipo, registro_numero, data_nascimento } = body ?? {}

    if (!email || !password || !nome) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 })
    }

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Configuração do servidor ausente' }, { status: 500 })
    }

    // Validar sessão do caller (ADMIN) via Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Sem autorização' }, { status: 401 })
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    const { data: callerData, error: callerErr } = await supabaseUser.auth.getUser()
    if (callerErr || !callerData?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    // Verificar que o caller é ADMIN ativo
    const { data: callerProfile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active, clinica_id')
      .eq('id', callerData.user.id)
      .single()

    if (profErr || !callerProfile || callerProfile.role !== 'ADMIN' || !callerProfile.is_active) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (!callerProfile.clinica_id) {
      return NextResponse.json({ error: 'Clínica não encontrada no perfil do admin' }, { status: 400 })
    }

    // Evitar e-mail duplicado
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 })
    }

    // Criar usuário no Auth
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
    })

    if (createErr || !created.user) {
      return NextResponse.json({ error: createErr?.message ?? 'Erro ao criar usuário' }, { status: 500 })
    }

    // Criar profile FUNCIONARIO vinculado à clínica
    const profileData: Record<string, any> = {
      id: created.user.id,
      email: email.trim().toLowerCase(),
      nome: nome.trim(),
      role: 'FUNCIONARIO',
      is_active: true,
      clinica_id: callerProfile.clinica_id,
    }

    if (profissao) profileData.profissao = profissao.trim()
    if (registro_tipo) profileData.registro_tipo = registro_tipo.trim()
    if (registro_numero) profileData.registro_numero = registro_numero.trim()
    if (data_nascimento) profileData.data_nascimento = data_nascimento

    const { error: profileErr } = await supabaseAdmin.from('profiles').insert(profileData)

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message ?? 'Erro ao criar perfil' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: created.user.id, email }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Erro inesperado no servidor' }, { status: 500 })
  }
}
