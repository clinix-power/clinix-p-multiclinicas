import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      nomeFantasia,
      email,
      telefone,
      responsavelNome,
      responsavelEmail,
      responsavelTelefone,
      planoNome,
      userId
    } = body

    if (!nomeFantasia || !email || !responsavelNome || !responsavelEmail || !planoNome || !userId) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: clinicaData, error: clinicaError } = await supabase
      .rpc('criar_clinica_trial', {
        p_nome_fantasia: nomeFantasia,
        p_email: email,
        p_responsavel_nome: responsavelNome,
        p_responsavel_email: responsavelEmail,
        p_telefone: telefone,
        p_plano_nome: planoNome
      })

    if (clinicaError) {
      console.error('Erro ao criar clínica:', clinicaError)
      return NextResponse.json(
        { error: 'Erro ao criar clínica: ' + clinicaError.message },
        { status: 500 }
      )
    }

    const clinicaId = clinicaData

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: responsavelEmail,
        nome: responsavelNome,
        role: 'ADMIN',
        clinica_id: clinicaId,
        is_active: true
      })

    if (profileError) {
      console.error('Erro ao criar profile:', profileError)
      return NextResponse.json(
        { error: 'Erro ao criar perfil: ' + profileError.message },
        { status: 500 }
      )
    }

    const { data: planoData } = await supabase
      .from('planos')
      .select('valor_ativacao')
      .eq('nome', planoNome)
      .single()

    const valorAtivacao = planoData?.valor_ativacao || 19.90

    const { error: pagamentoError } = await supabase
      .from('pagamentos')
      .insert({
        clinica_id: clinicaId,
        tipo: 'ATIVACAO',
        valor: valorAtivacao,
        status: 'PENDING',
        gateway: 'APPMAX'
      })

    if (pagamentoError) {
      console.error('Erro ao criar registro de pagamento:', pagamentoError)
    }

    return NextResponse.json({
      success: true,
      clinicaId,
      message: 'Clínica criada com sucesso'
    })

  } catch (error: any) {
    console.error('Erro na API criar clínica:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
