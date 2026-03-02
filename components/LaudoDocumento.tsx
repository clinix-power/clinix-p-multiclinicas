'use client'

import { forwardRef } from 'react'

type ConfiguracaoClinica = {
  nome_fantasia: string
  endereco_completo: string
  responsavel_tecnico: string
  documento_responsavel: string
  tipo_documento: string
}

type Paciente = {
  id: string
  nome: string
  data_nascimento: string | null
  cpf?: string | null
}

type Anamnese = {
  id: string
  profissional_id: string
  data_avaliacao: string
  qp: string | null
  hda: string | null
  exames_complementares: string | null
  diagnostico_fisio: string | null
  conduta: string | null
  assinatura_digital: string | null
}

type Evolucao = {
  id: string
  data_hora: string
  texto_original: string | null
  texto_melhorado_ia?: string | null
  profissional_id: string
}

type Profissional = {
  nome: string
  profissao: string | null
  registro_tipo: string | null
  registro_numero: string | null
}

type LaudoDocumentoProps = {
  configuracao: ConfiguracaoClinica
  paciente: Paciente
  anamnese: Anamnese
  evolucoes: Evolucao[]
  profissionais: Record<string, Profissional>
}

function formatDateBR(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function formatDateTimeBR(iso: string) {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} às ${hh}:${mi}`
}

function getMonthYear(iso: string) {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}/${yyyy}`
}

const LaudoDocumento = forwardRef<HTMLDivElement, LaudoDocumentoProps>(
  ({ configuracao, paciente, anamnese, evolucoes, profissionais }, ref) => {
    // Null checks - retorna null se dados essenciais não estiverem prontos
    if (!configuracao || !paciente || !anamnese) {
      return null
    }

    const evolucoesGroupedByMonth = (evolucoes || []).reduce((acc, evo) => {
      const monthYear = getMonthYear(evo.data_hora)
      if (!acc[monthYear]) acc[monthYear] = []
      acc[monthYear].push(evo)
      return acc
    }, {} as Record<string, Evolucao[]>)

    const monthYears = Object.keys(evolucoesGroupedByMonth).sort()
    const profissionalAnamnese = profissionais?.[anamnese.profissional_id] || {}
    const documentHash = `CP-${anamnese?.id?.substring(0, 8).toUpperCase() || 'XXXXXXXX'}`

    return (
      <div ref={ref} className="laudo-documento">
        <style jsx>{`
          .laudo-documento {
            width: 100%;
            max-width: 190mm;
            min-height: 297mm;
            padding: 0;
            margin: 0 auto;
            background: #fff;
            color: #000;
            font-family: 'Inter', 'Roboto', sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            overflow: visible;
            box-sizing: border-box;
          }

          @media print {
            .laudo-documento {
              display: block !important;
              overflow: visible !important;
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
            }

            @page {
              size: A4;
              margin: 15mm;
            }

            .avoid-break {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .page-break-before {
              break-before: page;
              page-break-before: always;
            }

            .laudo-footer {
              margin-top: 32px;
              padding-top: 12px;
              border-top: 2px solid #000;
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        `}</style>

        {/* Cabeçalho */}
        <div className="avoid-break" style={{ marginBottom: '24px', borderBottom: '2px solid #000', paddingBottom: '16px' }}>
          <h1 style={{ fontSize: '18pt', fontWeight: 'bold', margin: 0, marginBottom: '8px' }}>
            {configuracao?.nome_fantasia || 'Clínica não configurada'}
          </h1>
          <p style={{ fontSize: '10pt', margin: 0, marginBottom: '4px' }}>{configuracao?.endereco_completo || '—'}</p>
          <p style={{ fontSize: '10pt', margin: 0 }}>
            Responsável Técnico: {configuracao?.responsavel_tecnico || '—'} - {configuracao?.tipo_documento || 'CPF'}: {configuracao?.documento_responsavel || '—'}
          </p>
        </div>

        {/* Título do Documento */}
        <div className="avoid-break" style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16pt', fontWeight: 'bold', margin: 0, marginBottom: '8px' }}>
            LAUDO FISIOTERAPÊUTICO
          </h2>
          <p style={{ fontSize: '10pt', margin: 0, color: '#333' }}>
            Prontuário Fisioterapêutico
          </p>
        </div>

        {/* Dados do Paciente */}
        <div className="avoid-break" style={{ marginBottom: '24px', padding: '12px', border: '1px solid #000' }}>
          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: 0, marginBottom: '8px' }}>Dados do Paciente</h3>
          <p style={{ margin: '4px 0' }}><strong>Nome:</strong> {paciente?.nome || '—'}</p>
          <p style={{ margin: '4px 0' }}><strong>Data de Nascimento:</strong> {formatDateBR(paciente?.data_nascimento)}</p>
          {paciente?.cpf && <p style={{ margin: '4px 0' }}><strong>CPF:</strong> {paciente.cpf}</p>}
          <p style={{ margin: '4px 0' }}><strong>Data da Avaliação:</strong> {formatDateBR(anamnese?.data_avaliacao)}</p>
        </div>

        {/* Anamnese */}
        <div className="avoid-break" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14pt', fontWeight: 'bold', margin: 0, marginBottom: '16px', borderBottom: '1px solid #000', paddingBottom: '8px' }}>
            Avaliação Fisioterapêutica
          </h3>

          {anamnese?.qp && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '11pt', fontWeight: 'bold', margin: 0, marginBottom: '8px' }}>Queixa Principal (QP)</h4>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{anamnese?.qp}</p>
            </div>
          )}

          {anamnese?.hda && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '11pt', fontWeight: 'bold', margin: 0, marginBottom: '8px' }}>História da Doença Atual (HDA)</h4>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{anamnese?.hda}</p>
            </div>
          )}

          {anamnese?.exames_complementares && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '11pt', fontWeight: 'bold', margin: 0, marginBottom: '8px' }}>Exames Complementares</h4>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{anamnese?.exames_complementares}</p>
            </div>
          )}

          {anamnese?.diagnostico_fisio && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '11pt', fontWeight: 'bold', margin: 0, marginBottom: '8px' }}>Diagnóstico Fisioterapêutico</h4>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{anamnese?.diagnostico_fisio}</p>
            </div>
          )}

          {anamnese?.conduta && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '11pt', fontWeight: 'bold', margin: 0, marginBottom: '8px' }}>Conduta e Plano de Tratamento</h4>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{anamnese?.conduta}</p>
            </div>
          )}

          {/* Carimbo Profissional Anamnese */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #ccc' }}>
            <p style={{ margin: '4px 0', fontWeight: 'bold' }}>{profissionalAnamnese?.nome || '—'}</p>
            {profissionalAnamnese?.profissao && <p style={{ margin: '4px 0', fontSize: '10pt' }}>{profissionalAnamnese.profissao}</p>}
            {profissionalAnamnese?.registro_tipo && profissionalAnamnese?.registro_numero && (
              <p style={{ margin: '4px 0', fontSize: '10pt' }}>
                {profissionalAnamnese.registro_tipo} {profissionalAnamnese.registro_numero}
              </p>
            )}
            {anamnese?.assinatura_digital && (
              <img src={anamnese.assinatura_digital} alt="Assinatura" style={{ height: '60px', marginTop: '8px' }} />
            )}
          </div>
        </div>

        {/* Evoluções Clínicas - page break para não colar na anamnese */}
        {evolucoes && evolucoes.length > 0 && (
          <div className="page-break-before" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14pt', fontWeight: 'bold', margin: 0, marginBottom: '16px', borderBottom: '1px solid #000', paddingBottom: '8px' }}>
              Evoluções Clínicas
            </h3>

            {monthYears.map((monthYear) => (
              <div key={monthYear} className="avoid-break" style={{ marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#f5f5f5', padding: '8px 12px', marginBottom: '12px', borderLeft: '4px solid #000' }}>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '11pt' }}>{monthYear}</p>
                </div>

                {evolucoesGroupedByMonth[monthYear].map((evo) => {
                  const prof = profissionais?.[evo.profissional_id] || {}
                  return (
                    <div key={evo.id} className="avoid-break" style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e0e0e0' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '10pt', color: '#555' }}>
                        {formatDateTimeBR(evo.data_hora)}
                      </p>
                      <p style={{ margin: '0 0 12px 0', whiteSpace: 'pre-wrap' }}>{evo.texto_original || ''}</p>
                      
                      {/* Carimbo Profissional Evolução */}
                      <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
                        <p style={{ margin: '2px 0', fontSize: '10pt', fontWeight: 'bold' }}>{prof?.nome || '—'}</p>
                        {prof?.profissao && <p style={{ margin: '2px 0', fontSize: '9pt', color: '#666' }}>{prof.profissao}</p>}
                        {prof?.registro_tipo && prof?.registro_numero && (
                          <p style={{ margin: '2px 0', fontSize: '9pt', color: '#666' }}>
                            {prof.registro_tipo} {prof.registro_numero}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* Rodapé Legal */}
        <div className="avoid-break laudo-footer" style={{ marginTop: '48px', paddingTop: '16px', borderTop: '2px solid #000' }}>
          <p style={{ margin: '0 0 12px 0', textAlign: 'center', fontSize: '10pt', color: '#333', whiteSpace: 'normal', lineHeight: '1.6' }}>
            Este documento foi gerado eletronicamente e assinado digitalmente conforme as normas e diretrizes do CREFITO-MG.
          </p>
          <p style={{ margin: 0, textAlign: 'center', fontSize: '9pt', color: '#666' }}>
            Código de Autenticidade: {documentHash}
          </p>
        </div>
      </div>
    )
  }
)

LaudoDocumento.displayName = 'LaudoDocumento'

export default LaudoDocumento
