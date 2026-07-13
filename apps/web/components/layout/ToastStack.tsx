import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, BadgeCheck, Info, TriangleAlert, X } from 'lucide-react'
import { ToastPayload, toastEventName } from '../../services/toast'

type ToastItem = Required<Pick<ToastPayload, 'title'>> & ToastPayload & { id: string }

const toneStyles: Record<NonNullable<ToastPayload['tone']>, { shell: string; accent: string; icon: string }> = {
  info: {
    shell: 'border-slate-200 bg-white text-slate-900 shadow-sm',
    accent: 'bg-slate-400',
    icon: 'bg-slate-100 text-slate-700',
  },
  success: {
    shell: 'border-emerald-200 bg-white text-emerald-950 shadow-sm',
    accent: 'bg-emerald-500',
    icon: 'bg-emerald-100 text-emerald-700',
  },
  warning: {
    shell: 'border-amber-200 bg-white text-amber-950 shadow-sm',
    accent: 'bg-amber-500',
    icon: 'bg-amber-100 text-amber-800',
  },
  error: {
    shell: 'border-rose-200 bg-white text-rose-950 shadow-sm',
    accent: 'bg-rose-500',
    icon: 'bg-rose-100 text-rose-700',
  },
}

const toneIcons = {
  info: Info,
  success: BadgeCheck,
  warning: TriangleAlert,
  error: AlertCircle,
} satisfies Record<NonNullable<ToastPayload['tone']>, React.ComponentType<{ className?: string }>>

export function ToastStack() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const timers = new Map<string, number>()

    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastPayload>).detail
      if (!detail?.title) return
      const next: ToastItem = {
        id: detail.id || `toast_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        title: detail.title,
        description: detail.description,
        tone: detail.tone || 'info',
        durationMs: detail.durationMs ?? 4500,
      }

      setToasts((current) => [next, ...current].slice(0, 4))

      if (next.durationMs && next.durationMs > 0) {
        const timer = window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== next.id))
          timers.delete(next.id)
        }, next.durationMs)
        timers.set(next.id, timer)
      }
    }

    const handleRemove = (id: string) => {
      const timer = timers.get(id)
      if (timer) {
        window.clearTimeout(timer)
        timers.delete(id)
      }
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }

    window.addEventListener(toastEventName, handleToast)
    ;(window as any).__merlinRemoveToast = handleRemove

    return () => {
      window.removeEventListener(toastEventName, handleToast)
      timers.forEach((timer) => window.clearTimeout(timer))
      delete (window as any).__merlinRemoveToast
    }
  }, [])

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(92vw,24rem)] flex-col gap-2.5">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const tone = toast.tone || 'info'
          const styles = toneStyles[tone]
          const Icon = toneIcons[tone]

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.99 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className={`pointer-events-auto relative overflow-hidden rounded-2xl border ${styles.shell}`}
              role={tone === 'error' ? 'alert' : 'status'}
              aria-live={tone === 'error' ? 'assertive' : 'polite'}
              aria-atomic="true"
              data-tone={tone}
            >
              <div className={`absolute inset-y-0 left-0 w-1 ${styles.accent}`} />
              <div className="relative px-4 py-3.5 sm:px-5">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {tone === 'error' ? <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-700">Action blocked</div> : null}
                        <div className="text-sm font-semibold leading-5">{toast.title}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => (window as any).__merlinRemoveToast?.(toast.id)}
                        className="-mr-1 -mt-1 rounded-lg p-1.5 text-current/45 transition-colors hover:bg-black/5 hover:text-current focus:outline-none focus:ring-2 focus:ring-current/30"
                        aria-label="Dismiss notification"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {toast.description ? (
                      <div className="mt-1.5 text-[13px] leading-5 text-current/70">{toast.description}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
