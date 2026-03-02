'use client'

import { useEffect, useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'

type SignatureCanvasProps = {
  onSave: (base64: string) => void
  onClear?: () => void
  initialSignature?: string
  disabled?: boolean
}

export default function SignaturePad({
  onSave,
  onClear,
  initialSignature,
  disabled = false,
}: SignatureCanvasProps) {
  const sigCanvas = useRef<SignatureCanvas | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    if (initialSignature && sigCanvas.current) {
      sigCanvas.current.fromDataURL(initialSignature)
      setIsEmpty(false)
    }
  }, [initialSignature])

  const handleClear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear()
      setIsEmpty(true)
      onClear?.()
    }
  }

  const handleSave = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const base64 = sigCanvas.current.toDataURL('image/png')
      onSave(base64)
    }
  }

  const handleEnd = () => {
    if (sigCanvas.current) {
      setIsEmpty(sigCanvas.current.isEmpty())
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl border-2 border-dashed border-slate-300 bg-white overflow-hidden">
        <SignatureCanvas
          ref={sigCanvas}
          canvasProps={{
            className: 'w-full h-40 md:h-48 touch-none',
            style: { touchAction: 'none' },
          }}
          backgroundColor="rgba(255,255,255,1)"
          penColor="rgba(15,23,42,0.9)"
          minWidth={1}
          maxWidth={2.5}
          velocityFilterWeight={0.7}
          onEnd={handleEnd}
        />
        {isEmpty && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-slate-400">Assine aqui</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || isEmpty}
          className="flex-1 h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Limpar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || isEmpty}
          className="flex-1 h-10 px-4 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md"
        >
          Salvar Assinatura
        </button>
      </div>
    </div>
  )
}
