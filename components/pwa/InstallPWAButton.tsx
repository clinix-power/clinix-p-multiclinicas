'use client'

import { useEffect, useState } from 'react'

declare global {
  interface WindowEventMap {
    beforeinstallprompt: Event
  }
}

// alguns browsers expõem um event com prompt()
type BeforeInstallPromptEvent = Event & {
  prompt?: () => Promise<void>
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPWAButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // detecta se já está instalado
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      // @ts-ignore
      window.navigator?.standalone === true

    setInstalled(!!isStandalone)

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () =>
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  async function handleInstall() {
    if (!deferred?.prompt) return
    await deferred.prompt()
    setDeferred(null)
  }

  // ✅ já instalado → não renderiza nada
  if (installed) return null

  // ✅ iOS / Safari / browsers sem prompt
  if (!deferred) {
    return (
      <div className="w-full md:w-fit md:mx-auto rounded-3xl border border-slate-200/60 bg-white/90 backdrop-blur-xl p-6 shadow-lg shadow-slate-900/5">
        <div className="flex items-center gap-3 mb-3">
          <img 
            src="/icon-512.png" 
            alt="Clinix Power" 
            className="h-10 w-10 drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]"
          />
          <div>
            <div className="text-sm font-semibold text-slate-900">Instalar Clinix Power</div>
            <p className="text-[10px] text-slate-500">Use como app nativo</p>
          </div>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-700">iPhone:</span> Toque em Compartilhar (⬆︎) → "Adicionar à Tela de Início".
        </p>
      </div>
    )
  }

  // ✅ botão padrão (Android / Chrome / Edge)
  return (
    <button
      onClick={handleInstall}
      className="w-full md:w-fit md:px-8 px-6 py-4 rounded-3xl border border-slate-200/60 bg-white/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 hover:bg-white hover:border-purple-200 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30 group"
    >
      <div className="flex items-center gap-3">
        <img 
          src="/icon-512.png" 
          alt="Clinix Power" 
          className="h-10 w-10 drop-shadow-[0_0_8px_rgba(99,102,241,0.3)] group-hover:drop-shadow-[0_0_12px_rgba(99,102,241,0.5)] transition-all"
        />
        <div className="text-left">
          <div className="text-sm font-semibold text-slate-900">Instalar Clinix Power</div>
          <p className="text-[10px] text-slate-500">Use como app nativo</p>
        </div>
      </div>
    </button>
  )
}