import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const webhookSecret = process.env.APPMAX_WEBHOOK_SECRET || 'secret'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const headers = Object.fromEntries(request.headers.entries())

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    await supabase
      .from('webhooks_log')
      .insert({
        tipo: 'APPMAX_PAYMENT',
        payload: body,
        headers: headers,
        processado: false
      })

    const signature = request.headers.get('x-appmax-signature')
    
    if (signature !== webhookSecret) {
      console.warn('Webhook signature inválida')
    }

    const { event, transaction_id, status, amount } = body

    if (event === 'charge.paid' || event === 'payment.approved') {
      const { data: pagamento } = await supabase
        .from('pagamentos')
        .select('*, clinicas(*)')
        .eq('transaction_id', transaction_id)
        .single()

      if (!pagamento) {
        return NextResponse.json(
          { error: 'Pagamento não encontrado' },
          { status: 404 }
        )
      }

      if (pagamento.tipo === 'ATIVACAO') {
        const { error } = await supabase
          .rpc('processar_pagamento_ativacao', {
            p_clinica_id: pagamento.clinica_id,
            p_transaction_id: transaction_id,
            p_payment_method: body.payment_method || 'PIX'
          })

        if (error) {
          console.error('Erro ao processar pagamento de ativação:', error)
          throw error
        }

      } else if (pagamento.tipo === 'ASSINATURA' || pagamento.tipo === 'RENOVACAO') {
        const { error } = await supabase
          .rpc('processar_pagamento_assinatura', {
            p_clinica_id: pagamento.clinica_id,
            p_transaction_id: transaction_id,
            p_payment_method: body.payment_method || 'PIX'
          })

        if (error) {
          console.error('Erro ao processar pagamento de assinatura:', error)
          throw error
        }
      }

      await supabase
        .from('webhooks_log')
        .update({ processado: true })
        .eq('payload->transaction_id', transaction_id)

      return NextResponse.json({
        success: true,
        message: 'Webhook processado com sucesso'
      })

    } else if (event === 'charge.failed' || event === 'payment.rejected') {
      await supabase
        .from('pagamentos')
        .update({
          status: 'REJECTED'
        })
        .eq('transaction_id', transaction_id)

      return NextResponse.json({
        success: true,
        message: 'Pagamento rejeitado registrado'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Evento recebido'
    })

  } catch (error: any) {
    console.error('Erro no webhook:', error)
    
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
