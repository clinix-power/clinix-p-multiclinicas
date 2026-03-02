'use client'

import { useMemo } from 'react'
import Sidebar from '@/components/Sidebar'
import AuthGate from '@/components/AuthGate'
import ConsultoraClinix from '@/components/ConsultoraClinix'
import AlertaRenovacao from '@/components/AlertaRenovacao'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const allow = useMemo<('ADMIN' | 'FUNCIONARIO' | null)[]>(() => ['ADMIN', 'FUNCIONARIO'], [])

  return (
    <AuthGate allow={allow}>
      <div
        className="
          min-h-[100dvh]
          flex
          bg-[var(--background)]
          text-[var(--foreground)]
          overflow-x-hidden
          relative
        "
      >
        <Sidebar />
        <ConsultoraClinix />
        <AlertaRenovacao />

        <main
          className="
            flex-1
            relative
            p-3 sm:p-4 md:p-6
            md:ml-[284px]
            overflow-x-hidden
          "
        >
          {/* stage */}
          <div
            className="
              relative
              min-h-[calc(100dvh-32px)]
              w-full
              rounded-[32px]
              overflow-visible
            "
          >
            {/* SURFACE (premium) */}
            <div
              className="
                relative
                min-h-full
                w-full
                rounded-[32px]
                border border-black/[0.06]
                bg-[rgba(255,255,255,0.72)]
                shadow-[0_12px_40px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.02)]
                overflow-visible
              "
            >
              {/* brilho suave / moldura premium */}
              <div
                aria-hidden="true"
                className="
                  pointer-events-none absolute inset-0 rounded-[32px]
                  ring-1 ring-[rgba(168,85,247,0.14)]
                "
              />

              {/* ✅ Conteúdo interno — REMOVIDO padding extra (para não “prender” páginas) */}
              <div className="relative w-full min-h-full overflow-x-hidden">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGate>
  )
}