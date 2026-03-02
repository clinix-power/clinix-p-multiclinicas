'use client'

import { useId } from 'react'

type ClinixIconVariant = 'slim' | 'app'

type ClinixIconProps = {
  className?: string
  size?: number
  /**
   * 'slim' — Bolt-only, no background. For sidebar, header, login. (default)
   * 'app'  — Full icon with dark bg. For PWA splash, large display.
   */
  variant?: ClinixIconVariant
}

/**
 * CLINIX POWER — Unified Brand Icon (Método de 1 Milhão)
 *
 * Brand palette (synced with globals.css --m1/--m2):
 *   - #c084fc  purple-400  highlight
 *   - #a855f7  purple-500  primary
 *   - #9333ea  purple-600  primary-dark
 *   - #7c3aed  purple-700  depth
 *
 * Self-contained SVG — zero external dependencies.
 */
export default function ClinixIcon({
  className = '',
  size = 32,
  variant = 'slim',
}: ClinixIconProps) {
  const uid = useId()
  const gBolt = `${uid}-b`
  const gBg = `${uid}-bg`

  /* ─── SLIM: bolt only, brand-purple gradient ─── */
  if (variant === 'slim') {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        fill="none"
        aria-hidden="true"
        style={{ aspectRatio: '1/1' }}
      >
        <defs>
          <linearGradient id={gBolt} x1="0.35" y1="0" x2="0.65" y2="1">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>
        </defs>
        <path
          d="M13 2L3 14h8l-1 8 11-14h-8l0-6z"
          fill={`url(#${gBolt})`}
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  /* ─── APP: full icon with light purple background + gradient bolt ─── */
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      fill="none"
      aria-hidden="true"
      style={{ aspectRatio: '1/1' }}
    >
      <defs>
        <linearGradient id={gBg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f3e8ff" />
          <stop offset="100%" stopColor="#e9d5ff" />
        </linearGradient>

        <linearGradient id={gBolt} x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="120" height="120" rx="28" ry="28" fill={`url(#${gBg})`} />

      <g transform="translate(30, 20) scale(3)">
        <path d="M13 2L3 14h8l-1 8 11-14h-8l0-6z" fill={`url(#${gBolt})`} strokeLinejoin="round" />
      </g>
    </svg>
  )
}
