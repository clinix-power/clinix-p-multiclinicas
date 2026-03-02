'use client'

import { useEffect, useMemo, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function detectInstalled() {
  // Android/Chrome/Edge
  if (typeof window !== 'undefined') {
    const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches
    if (standalone) return true
    // iOS Safari
    // @ts-ignore
    if (typeof navigator !== 'undefined' && (navigator as any).standalone) return true
  }
  return false
}

export function usePWAInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState<boolean>(false)

  useEffect(() => {
    setInstalled(detectInstalled())

    const onBeforeInstall = (e: Event) => {
      // Chrome dispara isso antes de mostrar o mini-infobar
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }

    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    // Caso usuário instale por fora e volte, recalcular
    const media = window.matchMedia?.('(display-mode: standalone)')
    const onMedia = () => setInstalled(detectInstalled())
    media?.addEventListener?.('change', onMedia)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      media?.removeEventListener?.('change', onMedia)
    }
  }, [])

  const canPrompt = useMemo(() => !!deferred && !installed, [deferred, installed])

  async function promptInstall() {
    if (!deferred) return { ok: false as const, reason: 'no_deferred' as const }
    try {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === 'accepted') {
        // o evento appinstalled geralmente vai disparar depois
        return { ok: true as const, outcome: 'accepted' as const }
      }
      return { ok: true as const, outcome: 'dismissed' as const }
    } catch {
      return { ok: false as const, reason: 'error' as const }
    }
  }

  return {
    installed,
    canPrompt,
    promptInstall,
  }
}