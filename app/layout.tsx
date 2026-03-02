import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Clinix Power',
  description: 'PWA Clinix Power',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full overscroll-none">
      <head>
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover,user-scalable=no"
        />
        <meta name="theme-color" content="#a855f7" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Clinix Power" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
      </head>

      <body
        className="
          h-full
          min-h-[100dvh]
          antialiased
          bg-[var(--background)]
          text-[var(--foreground)]
          overflow-x-hidden
          overscroll-none
        "
      >
        <div
          id="__app"
          className="
            relative
            min-h-[100dvh]
            w-full
            overflow-x-hidden
            [padding-top:env(safe-area-inset-top)]
            [padding-bottom:env(safe-area-inset-bottom)]
          "
        >
          {/* stage global (neutro) */}
          <div className="relative min-h-[100dvh] w-full">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}