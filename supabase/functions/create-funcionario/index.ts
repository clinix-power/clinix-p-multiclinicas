import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Permite qualquer localhost (dev) e o domínio de produção
function getAllowedOrigin(req: Request) {
  const origin = req.headers.get("Origin") ?? ""
  // Aceitar qualquer porta de localhost em dev
  if (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.startsWith("https://")
  ) {
    return origin
  }
  return "http://localhost:3001"
}

// CORS “à prova de preflight”: ecoa os headers pedidos pelo browser
function buildCorsHeaders(req: Request) {
  const origin = getAllowedOrigin(req)

  // Browser manda isso no preflight:
  const reqHeaders =
    req.headers.get("Access-Control-Request-Headers") ||
    "authorization, apikey, content-type, x-client-info"

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": reqHeaders,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  } as Record<string, string>
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  const corsHeaders = buildCorsHeaders(req)
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  })
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req)

  // ✅ Preflight CORS (deve sempre responder OK)
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Método não permitido" }, 405)
  }

  try {
    const body = await req.json().catch(() => null)
    const email = body?.email?.trim()
    const password = body?.password
    const nome = body?.nome?.trim()

    if (!email || !password || !nome) {
      return jsonResponse(req, { error: "Dados obrigatórios ausentes" }, 400)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      // Isso evita falhas silenciosas e ajuda debug
      return jsonResponse(
        req,
        { error: "Env do Supabase ausente (URL / SERVICE_ROLE / ANON)" },
        500,
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // ✅ validar Authorization do caller (ADMIN)
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return jsonResponse(req, { error: "Sem autorização" }, 401)
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    const { data: callerData, error: callerErr } = await supabaseUser.auth.getUser()
    if (callerErr || !callerData?.user) {
      return jsonResponse(req, { error: "Não autenticado" }, 401)
    }

    const callerId = callerData.user.id

    const { data: callerProfile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("role, is_active, clinica_id")
      .eq("id", callerId)
      .single()

    if (profErr || !callerProfile || callerProfile.role !== "ADMIN" || !callerProfile.is_active) {
      return jsonResponse(req, { error: "Acesso negado" }, 403)
    }

    if (!callerProfile.clinica_id) {
      return jsonResponse(req, { error: "Clínica não encontrada no perfil do admin" }, 400)
    }

    // ✅ evitar e-mail duplicado no profiles
    const { data: existing, error: existErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (existErr) {
      return jsonResponse(req, { error: "Erro ao verificar e-mail" }, 500)
    }

    if (existing) {
      return jsonResponse(req, { error: "E-mail já cadastrado" }, 409)
    }

    // ✅ criar usuário no Auth
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

    if (createErr || !created.user) {
      return jsonResponse(req, { error: createErr?.message ?? "Erro ao criar usuário" }, 500)
    }

    // ✅ criar profile FUNCIONARIO com clinica_id e dados profissionais
    const profileData: any = {
      id: created.user.id,
      email,
      nome,
      role: "FUNCIONARIO",
      is_active: true,
      clinica_id: callerProfile.clinica_id,
    }

    // Adicionar campos opcionais se fornecidos
    if (body.profissao) profileData.profissao = body.profissao.trim()
    if (body.registro_tipo) profileData.registro_tipo = body.registro_tipo.trim()
    if (body.registro_numero) profileData.registro_numero = body.registro_numero.trim()
    if (body.data_nascimento) profileData.data_nascimento = body.data_nascimento

    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .insert(profileData)

    if (profileErr) {
      return jsonResponse(req, { error: profileErr.message ?? "Erro ao criar perfil" }, 500)
    }

    return jsonResponse(req, { success: true, id: created.user.id, email }, 201)
  } catch (e) {
    return new Response(JSON.stringify({ error: "Erro inesperado" }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
      },
    })
  }
})
