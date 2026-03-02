import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clinicaId, valor, tipo } = body

    if (!clinicaId || !valor || !tipo) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const pixCode = `00020126580014br.gov.bcb.pix0136${transactionId}520400005303986540${valor.toFixed(2)}5802BR5925CLINIX POWER MULTI6009SAO PAULO62070503***6304`
    
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { error: updateError } = await supabase
      .from('pagamentos')
      .update({
        transaction_id: transactionId,
        metadados: {
          pix_code: pixCode,
          qr_code_url: qrCodeUrl
        }
      })
      .eq('clinica_id', clinicaId)
      .eq('tipo', tipo)
      .eq('status', 'PENDING')

    if (updateError) {
      console.error('Erro ao atualizar pagamento:', updateError)
    }

    return NextResponse.json({
      success: true,
      pixCode,
      qrCode: qrCodeUrl,
      transactionId
    })

  } catch (error: any) {
    console.error('Erro ao gerar PIX:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
