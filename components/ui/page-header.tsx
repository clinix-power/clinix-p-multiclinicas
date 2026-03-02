'use client'

import { ArrowLeft, LucideIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'

type PageHeaderProps = {
  icon: LucideIcon
  title: string
  subtitle: string
  badge?: {
    text: string
    variant: 'success' | 'info' | 'warning'
  }
  action?: ReactNode
  showBackButton?: boolean
}

export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  action,
  showBackButton = false,
}: PageHeaderProps) {
  const router = useRouter()

  return (
    <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 mb-6 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Back Button - Mobile Only */}
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="md:hidden h-9 w-9 rounded-lg border border-slate-200/60 bg-white/90 flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95"
            >
              <ArrowLeft className="h-4 w-4 text-slate-600" />
            </button>
          )}

          {/* Icon Badge - Pacientes Purple Gradient */}
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Icon className="w-5 h-5 text-white" />
          </div>

          {/* Title & Subtitle */}
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {title}
            </h1>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>

          {/* Status Badge - Static for now */}
          {badge && badge.variant === 'success' && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs font-semibold text-green-700">{badge.text}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}
