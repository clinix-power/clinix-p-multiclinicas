import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clinicaId, valor, tipo, metodoPagamento, dadosCartao } = body

    if (!clinicaId || !valor || !tipo || !metodoPagamento) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: clinica, error: clinicaError } = await supabase
      .from('clinicas')
      .select('nome_fantasia, email, cpf_cnpj, telefone, responsavel_nome')
      .eq('id', clinicaId)
      .single()

    if (clinicaError || !clinica) {
      console.error('[checkout] Clínica não encontrada:', clinicaError)
      return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
    }

    const apiKey = process.env.APPMAX_API_KEY
    if (!apiKey) {
      console.error('[checkout] APPMAX_API_KEY não configurada')
      return NextResponse.json({ error: 'Chave Appmax não configurada' }, { status: 500 })
    }

    const nomePartes = (clinica.responsavel_nome || clinica.nome_fantasia || 'Cliente Clinix').trim().split(' ')
    const firstName = nomePartes[0]
    const lastName = nomePartes.slice(1).join(' ') || nomePartes[0]
    const documento = (clinica.cpf_cnpj || '').replace(/\D/g, '')
    const telefone = (clinica.telefone || '').replace(/\D/g, '') || '11999999999'

    let payment: Record<string, any> = { installments: 1 }

    if (metodoPagamento === 'credit_card') {
      if (!dadosCartao?.numero || !dadosCartao?.nome || !dadosCartao?.mes || !dadosCartao?.ano || !dadosCartao?.cvv) {
        return NextResponse.json({ error: 'Dados do cartão incompletos' }, { status: 400 })
      }
      payment = {
        type: 'credit_card',
        installments: dadosCartao.parcelas || 1,
        softDescriptor: 'CLINIX POWER',
        card_number: dadosCartao.numero.replace(/\s/g, ''),
        card_name: dadosCartao.nome.toUpperCase(),
        card_expiration_month: dadosCartao.mes,
        card_expiration_year: dadosCartao.ano,
        card_cvv: dadosCartao.cvv,
      }
    } else if (metodoPagamento === 'pix') {
      payment = {
        type: 'pix',
        installments: 1,
        softDescriptor: 'CLINIX POWER',
      }
    } else if (metodoPagamento === 'boleto') {
      payment = {
        type: 'boleto',
        installments: 1,
        softDescriptor: 'CLINIX POWER',
      }
    } else {
      return NextResponse.json({ error: 'Método de pagamento inválido' }, { status: 400 })
    }

    const appmaxPayload = {
      api_key: apiKey,
      cart: {
        currency: 'BRL',
        items: [
          {
            description: 'Ativação Clinix Power - 30 dias de acesso completo',
            quantity: 1,
            unit_price: Math.round(valor * 100),
          }
        ]
      },
      customer: {
        firstname: firstName,
        lastname: lastName,
        email: clinica.email,
        document_number: documento,
        phone: telefone,
      },
      payment,
    }

    const appmaxRes = await fetch('https://api.appmax.com.br/api/v3/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(appmaxPayload),
    })

    const appmaxData = await appmaxRes.json()

    if (!appmaxRes.ok) {
      console.error('[checkout] Appmax erro:', appmaxRes.status, JSON.stringify(appmaxData))
      return NextResponse.json(
        { error: 'Erro ao processar pagamento', detail: appmaxData },
        { status: appmaxRes.status }
      )
    }

    const transactionId = appmaxData?.data?.id || appmaxData?.id || `TXN_${Date.now()}` 

    let responseData: Record<string, any> = { success: true, transactionId }

    if (metodoPagamento === 'credit_card') {
      const status = appmaxData?.data?.payment?.status || appmaxData?.payment?.status || ''
      const approved = status === 'approved' || status === 'APPROVED'
      responseData = { ...responseData, approved, status }
    } else if (metodoPagamento === 'pix') {
      const pixCode = appmaxData?.data?.payment?.pix_qrcode
        || appmaxData?.payment?.pix_qrcode
        || appmaxData?.pix_qrcode
        || ''
      const pixQrCodeImage = appmaxData?.data?.payment?.pix_qrcode_image
        || appmaxData?.payment?.pix_qrcode_image
        || appmaxData?.pix_qrcode_image
        || ''
      if (!pixCode) {
        console.error('[checkout] PIX não retornado:', JSON.stringify(appmaxData))
        return NextResponse.json({ error: 'PIX não gerado', detail: appmaxData }, { status: 500 })
      }
      responseData = { ...responseData, pixCode, qrCode: pixQrCodeImage }
    } else if (metodoPagamento === 'boleto') {
      const boletoUrl = appmaxData?.data?.payment?.boleto_url
        || appmaxData?.payment?.boleto_url
        || appmaxData?.boleto_url
        || ''
      const boletoBarcode = appmaxData?.data?.payment?.boleto_barcode
        || appmaxData?.payment?.boleto_barcode
        || appmaxData?.boleto_barcode
        || ''
      if (!boletoUrl && !boletoBarcode) {
        console.error('[checkout] Boleto não retornado:', JSON.stringify(appmaxData))
        return NextResponse.json({ error: 'Boleto não gerado', detail: appmaxData }, { status: 500 })
      }
      responseData = { ...responseData, boletoUrl, boletoBarcode }
    }

    const metadados: Record<string, any> = {
      appmax_order_id: transactionId,
      metodo: metodoPagamento,
    }
    if (metodoPagamento === 'pix') {
      metadados.pix_code = responseData.pixCode
      metadados.qr_code_url = responseData.qrCode
    } else if (metodoPagamento === 'boleto') {
      metadados.boleto_url = responseData.boletoUrl
      metadados.boleto_barcode = responseData.boletoBarcode
    }

    const { error: updateError } = await supabase
      .from('pagamentos')
      .update({
        transaction_id: String(transactionId),
        metadados,
      })
      .eq('clinica_id', clinicaId)
      .eq('tipo', tipo)
      .eq('status', 'PENDING')

    if (updateError) {
      console.error('[checkout] Erro ao salvar no banco:', updateError)
    }

    if (metodoPagamento === 'credit_card' && responseData.approved) {
      await supabase
        .from('clinicas')
        .update({
          pagamento_ativacao_confirmado: true,
          status: 'ATIVA',
        })
        .eq('id', clinicaId)
    }

    return NextResponse.json(responseData)

  } catch (error: any) {
    console.error('[checkout] Erro interno:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
